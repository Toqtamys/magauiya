"""Единый формат логов для API и воркеров."""
import logging
import os


def setup_logging() -> None:
    level = os.environ.get("BOPASI_LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s [%(process)d] %(message)s",
    )
