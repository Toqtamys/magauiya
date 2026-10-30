"""Настройки сервера BOPASI из переменных окружения."""
from __future__ import annotations

import os
from pathlib import Path


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


DATA_DIR = Path(_env("BOPASI_DATA_DIR", str(Path(__file__).resolve().parent.parent / "data")))
UPLOAD_DIR = DATA_DIR / "uploads"
RESULT_DIR = DATA_DIR / "results"
MODELS_FILE = Path(_env("BOPASI_MODELS_FILE", str(Path(__file__).resolve().parent.parent / "models.yaml")))

# Максимальный размер одного файла (по умолчанию 4 ГБ — хватает на time-lapse Embryoscope)
MAX_UPLOAD_BYTES = int(_env("BOPASI_MAX_UPLOAD_MB", "4096")) * 1024 * 1024
# Сколько часов хранить загрузки и результаты
TTL_HOURS = float(_env("BOPASI_TTL_HOURS", "24"))
# Очередь: адрес Redis для Celery. BOPASI_EAGER=1 — выполнять задачи в процессе API (для разработки)
REDIS_URL = _env("BOPASI_REDIS_URL", "redis://localhost:6379/0")
EAGER = _env("BOPASI_EAGER", "0") == "1"
# Откуда разрешены запросы браузера (сайт на GitHub Pages и локальная разработка)
CORS_ORIGINS = [o.strip() for o in _env(
    "BOPASI_CORS",
    "https://toqtamys.github.io,http://localhost:8000,http://localhost:5173,null",
).split(",") if o.strip()]
# Устройство для моделей: cuda, cuda:1, cpu. Пусто — выбрать автоматически
DEVICE = _env("BOPASI_DEVICE", "")

for d in (UPLOAD_DIR, RESULT_DIR):
    d.mkdir(parents=True, exist_ok=True)
