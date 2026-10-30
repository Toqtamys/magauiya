"""Хранилище файлов и задач на диске.

Задача — папка results/<task_id>/ с файлами state.json (статус, прогресс)
и result.json. Так статус видят и API, и воркеры Celery на других машинах
с общим томом, без отдельной базы данных.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import time
import uuid
from pathlib import Path

from . import config

ID_RE = re.compile(r"^[a-f0-9]{32}$")
NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def new_id() -> str:
    return uuid.uuid4().hex


def safe_name(name: str) -> str:
    base = NAME_RE.sub("_", Path(name or "file").name)[:120]
    return base or "file"


def upload_path(file_id: str) -> Path | None:
    if not ID_RE.match(file_id):
        return None
    d = config.UPLOAD_DIR / file_id
    files = list(d.glob("*")) if d.is_dir() else []
    return files[0] if files else None


def task_dir(task_id: str) -> Path | None:
    if not ID_RE.match(task_id):
        return None
    return config.RESULT_DIR / task_id


def _write_json(p: Path, data: dict) -> None:
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, p)


def create_task(tool: str, file_ids: list[str], params: dict) -> str:
    tid = new_id()
    d = config.RESULT_DIR / tid
    d.mkdir(parents=True)
    _write_json(d / "state.json", {"task_id": tid, "tool": tool, "files": file_ids, "params": params,
                                   "status": "queued", "progress": 0.0, "message": "", "created": time.time()})
    return tid


def state(task_id: str) -> dict | None:
    d = task_dir(task_id)
    if not d or not (d / "state.json").exists():
        return None
    return json.loads((d / "state.json").read_text(encoding="utf-8"))


def update(task_id: str, **kw) -> None:
    d = task_dir(task_id)
    if not d:
        return
    s = state(task_id) or {}
    s.update(kw, updated=time.time())
    _write_json(d / "state.json", s)


def save_result(task_id: str, result: dict) -> None:
    d = task_dir(task_id)
    if d:
        _write_json(d / "result.json", result)


def result(task_id: str) -> dict | None:
    d = task_dir(task_id)
    if not d or not (d / "result.json").exists():
        return None
    return json.loads((d / "result.json").read_text(encoding="utf-8"))


def cleanup(now: float | None = None) -> int:
    """Удаляет загрузки и результаты старше TTL. Возвращает число удалённых папок."""
    now = now or time.time()
    limit = config.TTL_HOURS * 3600
    n = 0
    for root in (config.UPLOAD_DIR, config.RESULT_DIR):
        for d in root.iterdir():
            if d.is_dir() and now - d.stat().st_mtime > limit:
                shutil.rmtree(d, ignore_errors=True)
                n += 1
    return n
