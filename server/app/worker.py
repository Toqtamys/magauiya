"""Очередь задач: Celery + Redis.

Воркер для GPU-моделей запускается с очередью gpu, для лёгких — с очередью cpu:
    celery -A app.worker worker -Q gpu --concurrency 1
    celery -A app.worker worker -Q cpu --concurrency 4
С BOPASI_EAGER=1 задачи выполняются в отдельном потоке процесса API — для
разработки без Redis.
"""
from __future__ import annotations

import logging
import threading
import traceback

from celery import Celery

from . import config, jobs, registry
from .logging_setup import setup_logging
from .registry import BadInput, ToolUnavailable

setup_logging()
log = logging.getLogger(__name__)

celery_app = Celery("bopasi", broker=config.REDIS_URL, backend=None)
celery_app.conf.update(
    task_acks_late=True,               # задача вернётся в очередь, если воркер упадёт
    worker_prefetch_multiplier=1,      # одна тяжёлая задача на процесс за раз
    task_default_queue="cpu",
    broker_connection_retry_on_startup=True,
)


def execute(task_id: str) -> None:
    s = jobs.state(task_id)
    if not s:
        log.error("task %s not found", task_id)
        return
    tool = registry.get(s["tool"])
    jobs.update(task_id, status="running", progress=0.0, message="")

    def progress(p: float, msg: str = "") -> None:
        jobs.update(task_id, progress=round(max(0.0, min(1.0, p)), 3), message=msg)

    try:
        if tool is None:
            raise ToolUnavailable(f"неизвестный инструмент: {s['tool']}")
        files = [jobs.upload_path(fid) for fid in s["files"]]
        if any(f is None for f in files):
            raise BadInput("файл не найден: загрузка устарела или удалена")
        tool.validate(files)
        tool.check()
        tool.model()
        params = {**tool.info.params, **(s.get("params") or {})}
        res = tool.run(files, params, progress)
        jobs.save_result(task_id, {"task_id": task_id, "tool": tool.info.name, "result": res})
        jobs.update(task_id, status="done", progress=1.0, message="")
        log.info("task %s (%s) done", task_id, tool.info.name)
    except (BadInput, ToolUnavailable) as e:
        jobs.update(task_id, status="error", error=str(e), error_kind=type(e).__name__)
        log.warning("task %s rejected: %s", task_id, e)
    except Exception as e:  # noqa: BLE001 — любую ошибку модели показываем пользователю
        jobs.update(task_id, status="error", error=str(e) or type(e).__name__, error_kind="RuntimeError")
        log.error("task %s failed: %s", task_id, traceback.format_exc())


@celery_app.task(name="bopasi.run")
def run_task(task_id: str) -> None:
    execute(task_id)


def enqueue(task_id: str, gpu: bool) -> None:
    if config.EAGER:
        threading.Thread(target=execute, args=(task_id,), daemon=True).start()
    else:
        run_task.apply_async(args=[task_id], queue="gpu" if gpu else "cpu")
