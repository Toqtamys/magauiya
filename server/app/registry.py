"""Реестр инструментов анализа.

Каждый инструмент — подкласс Tool. Модель загружается лениво, при первом запуске
в процессе воркера, и остаётся в памяти до его перезапуска. Новый инструмент
добавляется одним классом с декоратором @register или одной записью в models.yaml
(внешняя программа, см. tools/command.py).
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

log = logging.getLogger(__name__)

Progress = Callable[[float, str], None]


class ToolUnavailable(RuntimeError):
    """Инструмент не может работать на этом сервере (нет весов, GPU или программы)."""


class BadInput(ValueError):
    """Файл или параметры не подходят инструменту."""


@dataclass
class ToolInfo:
    name: str
    section: str                       # andrology | embryology | histology | oncology | reproduction | drug
    title: dict[str, str]              # ru / kk / en
    accepts: list[str]                 # расширения файлов
    gpu: bool = False
    max_files: int = 1
    params: dict[str, Any] = field(default_factory=dict)
    source: str = ""                   # авторы и публикация


class Tool:
    info: ToolInfo

    def __init__(self) -> None:
        self._model: Any = None
        self._lock = threading.Lock()

    # ── переопределяется в подклассах
    def check(self) -> None:
        """Бросает ToolUnavailable, если инструменту чего-то не хватает."""

    def load(self) -> Any:
        """Загружает модель. Вызывается один раз на процесс."""
        return None

    def run(self, files: list[Path], params: dict, progress: Progress) -> dict:
        raise NotImplementedError

    # ── общее
    def model(self) -> Any:
        with self._lock:
            if self._model is None:
                log.info("loading model for %s", self.info.name)
                self._model = self.load() or True
        return self._model

    def status(self) -> dict:
        try:
            self.check()
            return {"available": True}
        except ToolUnavailable as e:
            return {"available": False, "reason": str(e)}

    def validate(self, files: list[Path]) -> None:
        if not files:
            raise BadInput("Нет файлов для анализа")
        if len(files) > self.info.max_files:
            raise BadInput(f"Инструмент принимает не больше {self.info.max_files} файлов")
        for f in files:
            if f.suffix.lower() not in self.info.accepts:
                raise BadInput(f"{f.name}: формат не подходит, нужен один из {', '.join(self.info.accepts)}")


_TOOLS: dict[str, Tool] = {}


def register(cls: type[Tool]) -> type[Tool]:
    t = cls()
    _TOOLS[t.info.name] = t
    return cls


def add(tool: Tool) -> None:
    _TOOLS[tool.info.name] = tool


def get(name: str) -> Tool | None:
    _ensure_loaded()
    return _TOOLS.get(name)


def all_tools() -> dict[str, Tool]:
    _ensure_loaded()
    return dict(_TOOLS)


_loaded = False


def _ensure_loaded() -> None:
    global _loaded
    if _loaded:
        return
    _loaded = True
    from .tools import histology, command  # noqa: F401,PLC0415 — регистрация при импорте

    command.load_from_yaml()
