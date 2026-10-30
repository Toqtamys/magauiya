"""Шаблон обёртки модели для BOPASI.

Скопируйте в папку репозитория модели как run_bopasi.py и замените predict()
вызовом самой модели. Контракт с сервером:
  --input PATH или --inputs PATH1,PATH2  — файлы пользователя;
  --output PATH                          — сюда записать JSON с результатом;
  строки "PROGRESS 0.5 текст" в stdout   — прогресс задачи;
  код выхода не 0                        — ошибка (текст из stderr увидит пользователь).
JSON результата: {"summary": {...ключевые числа...}, "items": [...], "notes": "..."}.
"""
import argparse
import json
import sys


def progress(p: float, msg: str = "") -> None:
    print(f"PROGRESS {p:.3f} {msg}", flush=True)


def predict(paths: list[str]) -> dict:
    raise NotImplementedError("подключите здесь модель из репозитория")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input")
    ap.add_argument("--inputs")
    ap.add_argument("--output", required=True)
    a, _ = ap.parse_known_args()
    paths = a.inputs.split(",") if a.inputs else [a.input]
    progress(0.0, "загрузка модели")
    try:
        res = predict(paths)
    except Exception as e:  # noqa: BLE001
        print(str(e), file=sys.stderr)
        return 1
    with open(a.output, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False)
    progress(1.0, "готово")
    return 0


if __name__ == "__main__":
    sys.exit(main())
