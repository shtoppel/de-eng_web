from __future__ import annotations

import json
from pathlib import Path
from typing import TypedDict

from app.config import SEED_WORDS_PATH

CATEGORIES: dict[str, str] = {
    "noun": "Nouns",
    "verb": "Verbs",
    "adjective": "Adjectives",
    "adverb": "Adverbs",
}
ARTICLES = ("der", "die", "das")


class SeedWord(TypedDict):
    category: str
    german: str
    english: str
    article: str | None
    example: str


def load_seed_words(path: Path = SEED_WORDS_PATH) -> list[SeedWord]:
    with path.open(encoding="utf-8") as seed_file:
        words = json.load(seed_file)
    validate_seed_words(words)
    return words


def validate_seed_words(words: object) -> None:
    if not isinstance(words, list):
        raise ValueError("Seed words must be a list")
    for index, word in enumerate(words, start=1):
        if not isinstance(word, dict):
            raise ValueError(f"Seed word #{index} must be an object")
        category = word.get("category")
        article = word.get("article")
        if category not in CATEGORIES:
            raise ValueError(f"Seed word #{index} has an unknown category")
        if category == "noun" and article not in ARTICLES:
            raise ValueError(f"Seed noun #{index} must have der, die, or das")
        if category != "noun" and article is not None:
            raise ValueError(f"Only nouns may have articles: seed word #{index}")
        for key in ("german", "english", "example"):
            if not isinstance(word.get(key), str) or not word[key].strip():
                raise ValueError(f"Seed word #{index} must have a non-empty {key}")
