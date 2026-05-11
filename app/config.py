from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = Path(__file__).resolve().parent / "static"
SEED_WORDS_PATH = ROOT_DIR / "data" / "seed_words.json"
DB_PATH = Path(os.getenv("APP_DB_PATH", "words.db"))
HOST = os.getenv("APP_HOST", "0.0.0.0")
PORT = int(os.getenv("APP_PORT", "8000"))
