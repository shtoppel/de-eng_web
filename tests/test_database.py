from __future__ import annotations

import tempfile
import unittest
from collections import Counter
from pathlib import Path

from app.database import add_word, article_question, check_article, fetch_words, init_db, random_word
from app.vocabulary import ARTICLES, CATEGORIES, load_seed_words


class DatabaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tempdir.name) / "test.db"
        init_db(self.db_path)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_seed_words_are_loaded_once(self) -> None:
        init_db(self.db_path)
        self.assertEqual(len(fetch_words(db_path=self.db_path)), len(load_seed_words()))

    def test_category_filtering(self) -> None:
        nouns = fetch_words("noun", self.db_path)
        self.assertGreaterEqual(len(nouns), 1000)
        self.assertTrue(all(word["category"] == "noun" for word in nouns))
        self.assertEqual(CATEGORIES["noun"], nouns[0]["category_label"])

    def test_seed_database_has_four_thousand_words(self) -> None:
        words = fetch_words(db_path=self.db_path)
        self.assertEqual(4000, len(words))
        self.assertEqual(
            {"adjective": 1000, "adverb": 1000, "noun": 1000, "verb": 1000},
            Counter(word["category"] for word in words),
        )

    def test_placeholder_seed_words_are_removed_from_existing_database(self) -> None:
        add_word(
            {
                "category": "verb",
                "german": "lernverb048en",
                "english": "to practice verb 048",
                "article": None,
                "example": "Wir lernverb048en heute zusammen.",
            },
            self.db_path,
        )
        init_db(self.db_path)
        words = fetch_words(db_path=self.db_path)
        self.assertTrue(all("lernverb" not in str(word["german"]) for word in words))
        self.assertTrue(all("practice verb 048" not in str(word["english"]) for word in words))

    def test_unknown_category_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            fetch_words("unknown", self.db_path)

    def test_random_word_can_be_scoped_to_category(self) -> None:
        word = random_word("verb", self.db_path)
        self.assertEqual("verb", word["category"])

    def test_article_question_and_check(self) -> None:
        question = article_question(self.db_path)
        self.assertEqual(set(ARTICLES), set(question["options"]))
        answer = check_article(int(question["id"]), str(question["options"][0]), self.db_path)
        self.assertEqual({"correct", "expected", "full_word"}, set(answer))

    def test_invalid_article_is_rejected(self) -> None:
        question = article_question(self.db_path)
        with self.assertRaises(ValueError):
            check_article(int(question["id"]), "the", self.db_path)

    def test_add_custom_word(self) -> None:
        created = add_word(
            {
                "category": "noun",
                "german": "Flugzeug",
                "english": "airplane",
                "article": "das",
                "example": "Das Flugzeug ist schnell.",
            },
            self.db_path,
        )
        self.assertEqual("Flugzeug", created["german"])
        self.assertEqual("das", created["article"])

    def test_duplicate_custom_word_is_rejected(self) -> None:
        payload = {
            "category": "verb",
            "german": "programmieren",
            "english": "to program",
            "article": None,
            "example": "Wir programmieren heute.",
        }
        add_word(payload, self.db_path)
        with self.assertRaises(ValueError):
            add_word(payload, self.db_path)

    def test_non_noun_article_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            add_word(
                {
                    "category": "verb",
                    "german": "laufen",
                    "english": "to run",
                    "article": "der",
                    "example": "Ich laufe schnell.",
                },
                self.db_path,
            )


if __name__ == "__main__":
    unittest.main()
