from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from app.database import article_question, check_article, fetch_words, init_db, random_word
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
        self.assertEqual(12, len(nouns))
        self.assertTrue(all(word["category"] == "noun" for word in nouns))
        self.assertEqual(CATEGORIES["noun"], nouns[0]["category_label"])

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


if __name__ == "__main__":
    unittest.main()
