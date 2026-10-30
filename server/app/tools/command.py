"""Внешние модели как программы: одна запись в models.yaml — один инструмент.

Так подключаются репозитории, у которых своё окружение и свои веса (STORK-V/BELA,
embryovision, HoVer-Net, RFdiffusion + ProteinMPNN и т. д.): сервер запускает их
команду в отдельном процессе, передаёт пути к файлам и забирает JSON с результатом.

Во время работы программа может печатать в stdout строки вида
    PROGRESS 0.42 сегментация кадров
— сервер покажет их как прогресс задачи.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import yaml

from .. import config
from ..device import gpu_info
from ..registry import Progress, Tool, ToolInfo, ToolUnavailable, add

log = logging.getLogger(__name__)


class CommandTool(Tool):
    def __init__(self, spec: dict) -> None:
        super().__init__()
        self.spec = spec
        self.info = ToolInfo(
            name=spec["name"], section=spec.get("section", "other"), title=spec.get("title", {"ru": spec["name"]}),
            accepts=[a.lower() for a in spec.get("accepts", [])], gpu=bool(spec.get("gpu", False)),
            max_files=int(spec.get("max_files", 1)), params=spec.get("params", {}), source=spec.get("source", ""),
        )

    def check(self) -> None:
        cmd = self.spec.get("command") or []
        if not cmd:
            raise ToolUnavailable("в models.yaml не задана команда запуска")
        for p in self.spec.get("requires", []):
            if not Path(p).exists():
                raise ToolUnavailable(f"не найдено: {p} (установите репозиторий и веса модели)")
        exe = cmd[0]
        if not (Path(exe).exists() or shutil.which(exe)):
            raise ToolUnavailable(f"программа не найдена: {exe}")
        if self.info.gpu and not gpu_info().get("cuda") and not self.spec.get("allow_cpu"):
            raise ToolUnavailable("нужна видеокарта с CUDA")

    def run(self, files: list[Path], params: dict, progress: Progress) -> dict:
        self.check()
        with tempfile.TemporaryDirectory(prefix=f"bopasi-{self.info.name}-") as tmp:
            out = Path(tmp) / "result.json"
            # параметры пользователя не могут подменить пути: служебные ключи ставятся последними
            subst = {**{k: str(v) for k, v in params.items()},
                     "input": str(files[0]), "inputs": ",".join(map(str, files)), "output": str(out), "tmp": tmp}
            cmd = [str(a).format(**subst) for a in self.spec["command"]]
            env = {**os.environ, **{k: str(v) for k, v in self.spec.get("env", {}).items()}}
            log.info("run %s: %s", self.info.name, " ".join(cmd))
            proc = subprocess.Popen(cmd, cwd=self.spec.get("workdir"), env=env, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE, text=True)
            tail: list[str] = []
            assert proc.stdout is not None
            for line in proc.stdout:
                line = line.rstrip()
                if line.startswith("PROGRESS "):
                    parts = line.split(maxsplit=2)
                    try:
                        progress(float(parts[1]), parts[2] if len(parts) > 2 else "")
                    except ValueError:
                        pass
                else:
                    tail = (tail + [line])[-30:]
            try:
                proc.wait(timeout=int(self.spec.get("timeout_s", 3600)))
            except subprocess.TimeoutExpired:
                proc.kill()
                raise RuntimeError("превышено время работы модели") from None
            err = proc.stderr.read() if proc.stderr else ""
            if proc.returncode != 0:
                log.error("%s failed (%s): %s", self.info.name, proc.returncode, err[-2000:])
                raise RuntimeError(f"модель завершилась с ошибкой (код {proc.returncode}): {err.strip()[-400:]}")
            if not out.exists():
                raise RuntimeError("модель не записала результат: ожидался JSON по пути {output}")
            return json.loads(out.read_text(encoding="utf-8"))


def load_from_yaml(path: Path | None = None) -> None:
    path = path or config.MODELS_FILE
    if not path.exists():
        log.warning("models file not found: %s", path)
        return
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    for spec in data.get("tools", []):
        try:
            add(CommandTool(spec))
        except Exception:  # noqa: BLE001 — одна плохая запись не должна ронять сервер
            log.exception("bad tool entry in %s: %s", path, spec.get("name"))
