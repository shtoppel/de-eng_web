from __future__ import annotations

import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


class StaticAppTests(unittest.TestCase):
    def test_frontend_build_outputs_static_assets(self) -> None:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=FRONTEND,
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)

        dist = FRONTEND / "dist"
        self.assertTrue((dist / "index.html").is_file())
        self.assertTrue((dist / "main.js").is_file())
        self.assertTrue((dist / "api.js").is_file())
        self.assertTrue((dist / "state.js").is_file())
        self.assertTrue((dist / "ui.js").is_file())
        self.assertTrue((dist / "game.js").is_file())
        self.assertTrue((dist / "styles.css").is_file())

    def test_frontend_source_preserves_trainer_controls(self) -> None:
        index = (FRONTEND / "src" / "index.html").read_text(encoding="utf-8")
        game = (FRONTEND / "src" / "game.ts").read_text(encoding="utf-8")
        api = (FRONTEND / "src" / "api.ts").read_text(encoding="utf-8")

        for text in [
            "English mode",
            "German mode",
            "Article mode",
            "Favorite words",
            "Show answer",
            "Add a custom word",
            "10 words",
            "100 words",
            "Infinite mode",
        ]:
            self.assertIn(text, index)

        self.assertIn("/api/words", api)
        self.assertIn("der', 'die', 'das", game)
        self.assertIn("createWord", game)
        self.assertIn("score", game)
        self.assertIn("favorite", game)


if __name__ == "__main__":
    unittest.main()
