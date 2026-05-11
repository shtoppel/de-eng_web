from __future__ import annotations

import random
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Mapping

from app.config import DB_PATH
from app.vocabulary import ARTICLES, CATEGORIES, load_seed_words


GENERATED_SEED_ARTIFACTS = (
    "Jahresküche",
    "Sommerfehler",
    "Morgenmuseum",
    "hinlernen",
    "Wochenfehler",
    "zu Hause reisen",
    "telefonisch trinken",
    "online trinken",
)


@contextmanager
def db(db_path: Path | None = None) -> Iterator[sqlite3.Connection]:
    path = db_path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db(db_path: Path | None = None) -> None:
    with db(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                german TEXT NOT NULL,
                english TEXT NOT NULL,
                article TEXT,
                example TEXT NOT NULL,
                UNIQUE(category, german, english)
            )
            """
        )
        remove_placeholder_seed_words(connection)
        remove_generated_seed_artifacts(connection)
        connection.executemany(
            """
            INSERT OR IGNORE INTO words (category, german, english, article, example)
            VALUES (:category, :german, :english, :article, :example)
            """,
            load_seed_words(),
        )


def remove_placeholder_seed_words(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        DELETE FROM words
        WHERE german LIKE 'Lernnomen %'
           OR german LIKE 'lernverb%en'
           OR german LIKE 'lernhaft%'
           OR german LIKE 'lernweise%'
           OR english LIKE 'study noun %'
           OR english LIKE 'to practice verb %'
           OR english LIKE 'practice adjective %'
           OR english LIKE 'practice adverb %'
        """
    )


def remove_generated_seed_artifacts(connection: sqlite3.Connection) -> None:
    placeholders = ", ".join("?" for _ in GENERATED_SEED_ARTIFACTS)
    connection.execute(
        f"DELETE FROM words WHERE german IN ({placeholders})",
        GENERATED_SEED_ARTIFACTS,
    )


def row_to_word(row: sqlite3.Row) -> dict[str, str | int | None]:
    return {
        "id": row["id"],
        "category": row["category"],
        "category_label": CATEGORIES[row["category"]],
        "german": row["german"],
        "english": row["english"],
        "article": row["article"],
        "example": row["example"],
    }


def fetch_words(category: str | None = None, db_path: Path | None = None) -> list[dict[str, str | int | None]]:
    if category is not None and category not in CATEGORIES:
        raise ValueError("Unknown category")
    query = "SELECT * FROM words"
    params: tuple[str, ...] = ()
    if category:
        query += " WHERE category = ?"
        params = (category,)
    query += " ORDER BY category, german"
    with db(db_path) as connection:
        rows = connection.execute(query, params).fetchall()
    return [row_to_word(row) for row in rows]


def normalize_word_payload(payload: Mapping[str, object]) -> dict[str, str | None]:
    category = str(payload.get("category", "")).strip()
    german = str(payload.get("german", "")).strip()
    english = str(payload.get("english", "")).strip()
    example = str(payload.get("example", "")).strip()
    raw_article = payload.get("article")
    article = str(raw_article).lower().strip() if raw_article not in (None, "") else None

    if category not in CATEGORIES:
        raise ValueError("Unknown category")
    for field_name, value in {"german": german, "english": english, "example": example}.items():
        if not value:
            raise ValueError(f"{field_name} is required")
    if category == "noun":
        if article not in ARTICLES:
            raise ValueError("Nouns require der, die, or das")
    elif article is not None:
        raise ValueError("Only nouns may have articles")

    return {
        "category": category,
        "german": german,
        "english": english,
        "article": article,
        "example": example,
    }


def get_word(word_id: int, db_path: Path | None = None) -> dict[str, str | int | None]:
    with db(db_path) as connection:
        row = connection.execute("SELECT * FROM words WHERE id = ?", (word_id,)).fetchone()
    if row is None:
        raise LookupError("Word not found")
    return row_to_word(row)


def add_word(payload: Mapping[str, object], db_path: Path | None = None) -> dict[str, str | int | None]:
    word = normalize_word_payload(payload)
    try:
        with db(db_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO words (category, german, english, article, example)
                VALUES (:category, :german, :english, :article, :example)
                """,
                word,
            )
            word_id = int(cursor.lastrowid)
    except sqlite3.IntegrityError as error:
        raise ValueError("Word already exists") from error
    return get_word(word_id, db_path)


def random_word(category: str | None = None, db_path: Path | None = None) -> dict[str, str | int | None]:
    words = fetch_words(category, db_path)
    if not words:
        raise LookupError("No words found")
    return random.choice(words)


def article_question(db_path: Path | None = None) -> dict[str, object]:
    with db(db_path) as connection:
        rows = connection.execute(
            "SELECT * FROM words WHERE category = 'noun' AND article IS NOT NULL"
        ).fetchall()
    if not rows:
        raise LookupError("No nouns with articles found")
    row = random.choice(rows)
    return {"id": row["id"], "noun": row["german"], "english": row["english"], "options": ARTICLES}


def check_article(word_id: int, article: str, db_path: Path | None = None) -> dict[str, str | bool]:
    normalized = article.lower().strip()
    if normalized not in ARTICLES:
        raise ValueError("Article must be der, die, or das")
    with db(db_path) as connection:
        row = connection.execute(
            "SELECT german, article FROM words WHERE id = ? AND category = 'noun'",
            (word_id,),
        ).fetchone()
    if row is None:
        raise LookupError("Noun not found")
    correct_article = row["article"]
    return {
        "correct": normalized == correct_article,
        "expected": correct_article,
        "full_word": f"{correct_article} {row['german']}",
    }
