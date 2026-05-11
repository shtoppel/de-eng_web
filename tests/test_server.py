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
        self.assertIn("DE-ENG Vocabulary Trainer", body)


if __name__ == "__main__":
    unittest.main()
