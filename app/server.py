from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from app.config import HOST, PORT, STATIC_DIR
from app.database import add_word, article_question, check_article, fetch_words, init_db, random_word
from app.vocabulary import CATEGORIES


class VocabularyHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        try:
            if parsed.path == "/":
                self.send_static_file(STATIC_DIR / "index.html")
            elif parsed.path.startswith("/static/"):
                self.send_static_file(static_path(parsed.path.removeprefix("/static/")))
            elif parsed.path == "/health":
                self.send_json({"status": "ok"})
            elif parsed.path == "/api/categories":
                self.send_json({"categories": CATEGORIES})
            elif parsed.path == "/api/words":
                self.send_json(fetch_words(one(query, "category")))
            elif parsed.path == "/api/words/random":
                self.send_json(random_word(one(query, "category")))
            elif parsed.path == "/api/articles/random":
                self.send_json(article_question())
            else:
                self.send_error_json(HTTPStatus.NOT_FOUND, "Not found")
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except LookupError as error:
            self.send_error_json(HTTPStatus.NOT_FOUND, str(error))

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            payload = self.read_json()
            if path == "/api/articles/check":
                self.send_json(check_article(int(payload["word_id"]), str(payload["article"])))
            elif path == "/api/words":
                self.send_json(add_word(payload), HTTPStatus.CREATED)
            else:
                self.send_error_json(HTTPStatus.NOT_FOUND, "Not found")
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except LookupError as error:
            self.send_error_json(HTTPStatus.NOT_FOUND, str(error))

    def read_json(self) -> dict[str, object]:
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length) or b"{}")
        if not isinstance(payload, dict):
            raise ValueError("JSON payload must be an object")
        return payload

    def send_json(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_static_file(self, path: Path) -> None:
        if not is_safe_static_path(path) or not path.is_file():
            self.send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        body = path.read_bytes()
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json"}:
            content_type += "; charset=utf-8"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status: HTTPStatus, message: str) -> None:
        self.send_json({"error": message}, status)

    def log_message(self, format: str, *args: object) -> None:
        print("%s - - %s" % (self.address_string(), format % args))


def one(query: dict[str, list[str]], key: str) -> str | None:
    values = query.get(key)
    return values[0] if values else None


def static_path(relative_path: str) -> Path:
    return STATIC_DIR / relative_path


def is_safe_static_path(path: Path) -> bool:
    try:
        path.resolve().relative_to(STATIC_DIR.resolve())
    except ValueError:
        return False
    return True


def run() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), VocabularyHandler)
    print(f"Serving vocabulary trainer on http://{HOST}:{PORT}")
    server.serve_forever()
