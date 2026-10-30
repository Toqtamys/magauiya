"""Выбор устройства для моделей: GPU, если есть, иначе CPU."""
from __future__ import annotations

import logging

from . import config

log = logging.getLogger(__name__)


def pick_device() -> str:
    if config.DEVICE:
        return config.DEVICE
    try:
        import torch  # noqa: PLC0415 — torch нужен только моделям на GPU

        if torch.cuda.is_available():
            return "cuda"
    except ImportError:
        pass
    return "cpu"


def gpu_info() -> dict:
    try:
        import torch  # noqa: PLC0415

        if torch.cuda.is_available():
            return {
                "cuda": True,
                "devices": [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())],
            }
    except ImportError:
        return {"cuda": False, "reason": "PyTorch не установлен"}
    return {"cuda": False}
