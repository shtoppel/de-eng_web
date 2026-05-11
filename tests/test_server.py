from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path


class ServerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.port = "8765"
        env = os.environ.copy()
        env["APP_DB_PATH"] = str(Path(self.tempdir.name) / "server.db")
        env["APP_PORT"] = self.port
        self.process = subprocess.Popen(
            [sys.executable, "-m", "app.main"],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
            text=True,
        )
        self.base_url = f"http://127.0.0.1:{self.port}"
        self.wait_until_ready()

    def tearDown(self) -> None:
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
        self.tempdir.cleanup()

    def wait_until_ready(self) -> None:
        deadline = time.time() + 5
        while time.time() < deadline:
            try:
                self.get_json("/health")
                return
            except (urllib.error.URLError, json.JSONDecodeError):
                time.sleep(0.1)
        self.fail("Server did not become ready")

    def get_json(self, path: str) -> dict | list:
        with urllib.request.urlopen(f"{self.base_url}{path}", timeout=3) as response:
            return json.loads(response.read().decode("utf-8"))

    def post_json(self, path: str, payload: dict) -> tuple[int, dict]:
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=3) as response:
            return response.status, json.loads(response.read().decode("utf-8"))

    def test_health_endpoint(self) -> None:
        self.assertEqual({"status": "ok"}, self.get_json("/health"))

    def test_categories_endpoint(self) -> None:
        payload = self.get_json("/api/categories")
        self.assertIn("noun", payload["categories"])

    def test_article_endpoint(self) -> None:
        payload = self.get_json("/api/articles/random")
        self.assertEqual(["der", "die", "das"], payload["options"])

    def test_static_index_is_served(self) -> None:
        with urllib.request.urlopen(self.base_url, timeout=3) as response:
            body = response.read().decode("utf-8")
        self.assertIn("De-Eng Vocabulary Trainer", body)
        self.assertIn("English mode", body)
        self.assertIn("Article mode", body)
        self.assertIn("Correct", body)
        self.assertIn("Accuracy", body)
        self.assertIn("Multichoice mode", body)
        self.assertIn("Cards mode", body)
        self.assertIn("Favorite words", body)
        self.assertIn("Show answer", body)
        self.assertIn("Add to favorites", body)
        self.assertIn("10 words", body)
        self.assertIn("100 words", body)
        self.assertIn("Infinite mode", body)

    def test_custom_word_can_be_added(self) -> None:
        status, payload = self.post_json(
            "/api/words",
            {
                "category": "adverb",
                "german": "neulich",
                "english": "recently",
                "article": None,
                "example": "Neulich war ich dort.",
            },
        )
        self.assertEqual(201, status)
        self.assertEqual("neulich", payload["german"])
        self.assertEqual("Adverbs", payload["category_label"])


if __name__ == "__main__":
    unittest.main()
