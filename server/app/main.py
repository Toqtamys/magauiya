"""BOPASI API.

    POST /api/upload                 — загрузка файла (multipart), ответ {file_id}
    POST /api/analyze/{tool_name}    — запуск анализа {file_ids, params}, ответ {task_id}
    GET  /api/status/{task_id}       — статус и прогресс
    GET  /api/result/{task_id}       — результат JSON
    GET  /api/report/{task_id}       — отчёт: ?format=json|csv|txt
    GET  /api/tools                  — инструменты и их доступность на этом сервере
    GET  /api/health                 — проверка сервера
"""
from __future__ import annotations

import csv
import io
import json
import logging
import time

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

from . import config, jobs, registry, worker
from .device import gpu_info
from .logging_setup import setup_logging

setup_logging()
log = logging.getLogger("bopasi.api")

app = FastAPI(title="BOPASI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    t0 = time.perf_counter()
    try:
        resp = await call_next(request)
    except Exception:
        log.exception("unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse({"detail": "внутренняя ошибка сервера"}, status_code=500)
    log.info("%s %s %s %.0fms", request.method, request.url.path, resp.status_code, (time.perf_counter() - t0) * 1000)
    return resp


class AnalyzeRequest(BaseModel):
    file_ids: list[str] = Field(min_length=1, max_length=50)
    params: dict = Field(default_factory=dict)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "gpu": gpu_info(), "queue": "eager" if config.EAGER else "celery"}


@app.get("/api/tools")
def tools() -> dict:
    out = []
    for name, t in registry.all_tools().items():
        i = t.info
        out.append({"name": name, "section": i.section, "title": i.title, "accepts": i.accepts, "gpu": i.gpu,
                    "max_files": i.max_files, "params": i.params, "source": i.source, **t.status()})
    return {"tools": out}


@app.post("/api/upload")
async def upload(file: UploadFile) -> dict:
    fid = jobs.new_id()
    d = config.UPLOAD_DIR / fid
    d.mkdir(parents=True)
    dest = d / jobs.safe_name(file.filename or "file")
    size = 0
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > config.MAX_UPLOAD_BYTES:
                f.close()
                dest.unlink(missing_ok=True)
                d.rmdir()
                raise HTTPException(413, f"файл больше {config.MAX_UPLOAD_BYTES // 1024 // 1024} МБ")
            f.write(chunk)
    if size == 0:
        dest.unlink(missing_ok=True)
        d.rmdir()
        raise HTTPException(400, "пустой файл")
    log.info("upload %s %s %d bytes", fid, dest.name, size)
    return {"file_id": fid, "name": dest.name, "size": size}


@app.post("/api/analyze/{tool_name}", status_code=202)
def analyze(tool_name: str, req: AnalyzeRequest) -> dict:
    tool = registry.get(tool_name)
    if tool is None:
        raise HTTPException(404, f"нет инструмента {tool_name}")
    st = tool.status()
    if not st["available"]:
        raise HTTPException(503, f"{tool_name} недоступен на этом сервере: {st['reason']}")
    files = [jobs.upload_path(fid) for fid in req.file_ids]
    missing = [fid for fid, f in zip(req.file_ids, files) if f is None]
    if missing:
        raise HTTPException(404, f"файлы не найдены: {', '.join(missing)}")
    try:
        tool.validate(files)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    tid = jobs.create_task(tool_name, req.file_ids, req.params)
    worker.enqueue(tid, tool.info.gpu)
    return {"task_id": tid, "status": "queued"}


@app.get("/api/status/{task_id}")
def status(task_id: str) -> dict:
    s = jobs.state(task_id)
    if not s:
        raise HTTPException(404, "задача не найдена")
    keep = ("task_id", "tool", "status", "progress", "message", "error", "error_kind", "created", "updated")
    return {k: s[k] for k in keep if k in s}


@app.get("/api/result/{task_id}")
def result(task_id: str) -> dict:
    s = jobs.state(task_id)
    if not s:
        raise HTTPException(404, "задача не найдена")
    if s["status"] == "error":
        raise HTTPException(422, s.get("error", "ошибка"))
    r = jobs.result(task_id)
    if r is None:
        raise HTTPException(409, f"задача ещё не готова: {s['status']}")
    return r


@app.get("/api/report/{task_id}")
def report(task_id: str, format: str = "json") -> Response:  # noqa: A002 — имя параметра в URL
    r = result(task_id)
    name = f"bopasi-{r['tool']}-{task_id[:8]}"
    if format == "json":
        return Response(json.dumps(r, ensure_ascii=False, indent=2), media_type="application/json",
                        headers={"Content-Disposition": f'attachment; filename="{name}.json"'})
    flat = _flatten(r.get("result", {}).get("summary", r.get("result", {})))
    if format == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["key", "value"])
        w.writerows(flat.items())
        return Response(buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="{name}.csv"'})
    if format == "txt":
        lines = [f"BOPASI · {r['tool']} · {task_id}", *[f"{k}: {v}" for k, v in flat.items()],
                 "", "Результат носит исследовательский характер и не является медицинским заключением."]
        return PlainTextResponse("\n".join(lines))
    raise HTTPException(400, "format: json, csv или txt")


def _flatten(d: dict, prefix: str = "") -> dict:
    out = {}
    for k, v in (d or {}).items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(_flatten(v, key + "."))
        elif not isinstance(v, list):
            out[key] = v
    return out


@app.post("/api/cleanup")
def cleanup() -> dict:
    return {"removed": jobs.cleanup()}
