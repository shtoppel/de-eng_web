from __future__ import annotations

import json
import os
import random
import sqlite3
from contextlib import contextmanager
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Iterator
from urllib.parse import parse_qs, urlparse

CATEGORIES: dict[str, str] = {
    "noun": "Существительные",
    "verb": "Глаголы",
    "adjective": "Прилагательные",
    "adverb": "Наречия",
}
ARTICLES = ("der", "die", "das")
DB_PATH = Path(os.getenv("APP_DB_PATH", "words.db"))
HOST = os.getenv("APP_HOST", "0.0.0.0")
PORT = int(os.getenv("APP_PORT", "8000"))

SEED_WORDS: list[tuple[str, str, str, str | None, str]] = [
    ("noun", "Haus", "house", "das", "Ich wohne in einem großen Haus."),
    ("noun", "Zeit", "time", "die", "Wir haben heute wenig Zeit."),
    ("noun", "Mensch", "person", "der", "Jeder Mensch lernt anders."),
    ("noun", "Stadt", "city", "die", "Berlin ist eine große Stadt."),
    ("noun", "Kind", "child", "das", "Das Kind spielt im Garten."),
    ("noun", "Tag", "day", "der", "Heute ist ein schöner Tag."),
    ("noun", "Arbeit", "work", "die", "Die Arbeit beginnt um neun Uhr."),
    ("noun", "Buch", "book", "das", "Das Buch liegt auf dem Tisch."),
    ("noun", "Freund", "friend", "der", "Mein Freund kommt aus Hamburg."),
    ("noun", "Sprache", "language", "die", "Deutsch ist eine schöne Sprache."),
    ("noun", "Wasser", "water", "das", "Das Wasser ist kalt."),
    ("noun", "Weg", "way", "der", "Der Weg zum Bahnhof ist kurz."),
    ("verb", "sein", "to be", None, "Ich bin heute zu Hause."),
    ("verb", "haben", "to have", None, "Wir haben eine Frage."),
    ("verb", "machen", "to do / make", None, "Sie macht ihre Hausaufgaben."),
    ("verb", "gehen", "to go", None, "Er geht jeden Morgen zur Schule."),
    ("verb", "kommen", "to come", None, "Kommst du heute Abend?"),
    ("verb", "sehen", "to see", None, "Ich sehe den Hund."),
    ("verb", "sprechen", "to speak", None, "Wir sprechen Deutsch und Englisch."),
    ("verb", "lernen", "to learn", None, "Sie lernt neue Wörter."),
    ("verb", "finden", "to find", None, "Ich finde die Lösung."),
    ("verb", "geben", "to give", None, "Er gibt mir das Buch."),
    ("adjective", "gut", "good", None, "Das ist eine gute Idee."),
    ("adjective", "neu", "new", None, "Ich kaufe ein neues Handy."),
    ("adjective", "alt", "old", None, "Das alte Auto fährt noch."),
    ("adjective", "klein", "small", None, "Die kleine Katze schläft."),
    ("adjective", "groß", "big / tall", None, "Der große Baum steht im Park."),
    ("adjective", "wichtig", "important", None, "Diese Regel ist wichtig."),
    ("adjective", "schnell", "fast", None, "Der Zug ist sehr schnell."),
    ("adjective", "schön", "beautiful", None, "Wir haben schönes Wetter."),
    ("adverb", "heute", "today", None, "Heute lernen wir Artikel."),
    ("adverb", "morgen", "tomorrow", None, "Morgen fahren wir nach Köln."),
    ("adverb", "gern", "gladly / like to", None, "Ich trinke gern Kaffee."),
    ("adverb", "oft", "often", None, "Wir üben oft zusammen."),
    ("adverb", "immer", "always", None, "Sie ist immer pünktlich."),
    ("adverb", "nie", "never", None, "Er kommt nie zu spät."),
    ("adverb", "hier", "here", None, "Bitte warten Sie hier."),
    ("adverb", "dort", "there", None, "Dort ist der Eingang."),
]


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    with db() as connection:
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
        connection.executemany(
            """
            INSERT OR IGNORE INTO words (category, german, english, article, example)
            VALUES (?, ?, ?, ?, ?)
            """,
            SEED_WORDS,
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


def fetch_words(category: str | None = None) -> list[dict[str, str | int | None]]:
    if category is not None and category not in CATEGORIES:
        raise ValueError("Unknown category")
    query = "SELECT * FROM words"
    params: tuple[str, ...] = ()
    if category:
        query += " WHERE category = ?"
        params = (category,)
    query += " ORDER BY category, german"
    with db() as connection:
        rows = connection.execute(query, params).fetchall()
    return [row_to_word(row) for row in rows]


def article_question() -> dict[str, object]:
    with db() as connection:
        rows = connection.execute(
            "SELECT * FROM words WHERE category = 'noun' AND article IS NOT NULL"
        ).fetchall()
    if not rows:
        raise LookupError("No nouns with articles found")
    row = random.choice(rows)
    return {"id": row["id"], "noun": row["german"], "english": row["english"], "options": ARTICLES}


def check_article(word_id: int, article: str) -> dict[str, str | bool]:
    normalized = article.lower().strip()
    if normalized not in ARTICLES:
        raise ValueError("Article must be der, die, or das")
    with db() as connection:
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


class VocabularyHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        try:
            if parsed.path == "/":
                self.send_html(HTML)
            elif parsed.path == "/api/categories":
                self.send_json({"categories": CATEGORIES})
            elif parsed.path == "/api/words":
                self.send_json(fetch_words(one(query, "category")))
            elif parsed.path == "/api/words/random":
                words = fetch_words(one(query, "category"))
                if not words:
                    self.send_error_json(HTTPStatus.NOT_FOUND, "No words found")
                    return
                self.send_json(random.choice(words))
            elif parsed.path == "/api/articles/random":
                self.send_json(article_question())
            else:
                self.send_error_json(HTTPStatus.NOT_FOUND, "Not found")
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except LookupError as error:
            self.send_error_json(HTTPStatus.NOT_FOUND, str(error))

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/articles/check":
            self.send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        try:
            payload = self.read_json()
            self.send_json(check_article(int(payload["word_id"]), str(payload["article"])))
        except (KeyError, TypeError, ValueError) as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except LookupError as error:
            self.send_error_json(HTTPStatus.NOT_FOUND, str(error))

    def read_json(self) -> dict[str, object]:
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def send_json(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html: str) -> None:
        body = html.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
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


def run() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), VocabularyHandler)
    print(f"Serving vocabulary trainer on http://{HOST}:{PORT}")
    server.serve_forever()


HTML = """
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DE-ENG Vocabulary Trainer</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; background: #f5f7fb; color: #172033; }
    header { background: linear-gradient(135deg, #1d4ed8, #7c3aed); color: white; padding: 32px 20px; text-align: center; }
    main { max-width: 980px; margin: -24px auto 40px; padding: 0 16px; }
    .panel { background: white; border-radius: 20px; box-shadow: 0 18px 45px #1f29371f; padding: 24px; margin-bottom: 20px; }
    .menu { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 12px; }
    button { border: 0; border-radius: 14px; cursor: pointer; font-size: 16px; font-weight: 700; padding: 14px 16px; transition: .18s ease; }
    button:hover { transform: translateY(-1px); }
    .menu button { background: #e0e7ff; color: #1e3a8a; }
    .menu button.active { background: #2563eb; color: white; }
    .article-button { background: #fef3c7; color: #92400e; }
    .word-card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 20px; min-height: 180px; }
    .word { font-size: clamp(36px, 7vw, 64px); font-weight: 900; margin: 0; }
    .translation { color: #475569; font-size: 24px; margin: 8px 0 16px; }
    .example { background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 10px; padding: 12px 14px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
    .primary { background: #16a34a; color: white; }
    .secondary { background: #e2e8f0; color: #0f172a; }
    .article-options { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
    .article-options button { background: #ede9fe; color: #5b21b6; min-width: 90px; }
    .result { margin-top: 14px; font-weight: 800; }
    .ok { color: #15803d; }
    .bad { color: #b91c1c; }
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a; color: #e2e8f0; }
      .panel { background: #111827; }
      .word-card { border-color: #334155; }
      .translation { color: #cbd5e1; }
      .example { background: #1e293b; }
      .secondary { background: #334155; color: #e2e8f0; }
    }
  </style>
</head>
<body>
  <header>
    <h1>DE-ENG тренажёр слов</h1>
    <p>Выбирайте части речи, запускайте случайный режим и отдельно тренируйте немецкие артикли.</p>
  </header>
  <main>
    <section class="panel">
      <h2>Меню категорий</h2>
      <div class="menu" id="menu">
        <button data-mode="noun">Существительные</button>
        <button data-mode="verb">Глаголы</button>
        <button data-mode="adjective">Прилагательные</button>
        <button data-mode="adverb">Наречия</button>
        <button data-mode="random">🎲 Рандом</button>
        <button class="article-button" data-mode="articles">der / die / das</button>
      </div>
    </section>

    <section class="panel word-card" id="trainer">
      <p id="modeLabel">Выберите режим</p>
      <h2 class="word" id="word">Willkommen!</h2>
      <p class="translation" id="translation">Нажмите на категорию, чтобы начать тренировку.</p>
      <p class="example" id="example">Слова уже загружены в SQLite-базу при старте приложения.</p>
      <div class="article-options" id="articleOptions" hidden></div>
      <p class="result" id="result"></p>
      <div class="actions">
        <button class="primary" id="nextButton">Следующее слово</button>
        <button class="secondary" id="showButton">Показать перевод</button>
      </div>
    </section>
  </main>

  <script>
    const modeLabel = document.querySelector('#modeLabel');
    const word = document.querySelector('#word');
    const translation = document.querySelector('#translation');
    const example = document.querySelector('#example');
    const result = document.querySelector('#result');
    const nextButton = document.querySelector('#nextButton');
    const showButton = document.querySelector('#showButton');
    const articleOptions = document.querySelector('#articleOptions');
    const menuButtons = [...document.querySelectorAll('#menu button')];
    const labels = { noun: 'Существительные', verb: 'Глаголы', adjective: 'Прилагательные', adverb: 'Наречия', random: 'Рандомный режим', articles: 'Тренировка артиклей' };
    let mode = 'random';
    let current = null;

    function setMode(nextMode) {
      mode = nextMode;
      menuButtons.forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
      loadNext();
    }

    async function loadNext() {
      result.textContent = '';
      articleOptions.hidden = mode !== 'articles';
      showButton.hidden = mode === 'articles';
      if (mode === 'articles') {
        const response = await fetch('/api/articles/random');
        current = await response.json();
        modeLabel.textContent = labels[mode];
        word.textContent = current.noun;
        translation.textContent = current.english;
        example.textContent = 'Выберите правильный немецкий артикль.';
        articleOptions.innerHTML = current.options.map(article => `<button data-article="${article}">${article}</button>`).join('');
        return;
      }
      const query = mode === 'random' ? '' : `?category=${mode}`;
      const response = await fetch(`/api/words/random${query}`);
      current = await response.json();
      modeLabel.textContent = mode === 'random' ? `${labels[mode]} · ${current.category_label}` : labels[mode];
      word.textContent = current.article ? `${current.article} ${current.german}` : current.german;
      translation.textContent = 'Перевод скрыт';
      example.textContent = current.example;
    }

    async function checkArticle(article) {
      const response = await fetch('/api/articles/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: current.id, article }),
      });
      const answer = await response.json();
      result.className = `result ${answer.correct ? 'ok' : 'bad'}`;
      result.textContent = answer.correct ? `Верно: ${answer.full_word}` : `Нужно: ${answer.full_word}`;
    }

    menuButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    nextButton.addEventListener('click', loadNext);
    showButton.addEventListener('click', () => {
      if (current && mode !== 'articles') translation.textContent = current.english;
    });
    articleOptions.addEventListener('click', event => {
      if (event.target.dataset.article) checkArticle(event.target.dataset.article);
    });
    setMode('random');
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    run()
