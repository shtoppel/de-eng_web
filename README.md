# DE-ENG Vocabulary Trainer

A small German-English vocabulary trainer with a SQLite database, category-based practice modes, random word practice, and a dedicated German article trainer.

## Features

- Word categories for nouns, verbs, adjectives, and adverbs.
- Random mode across the full vocabulary database.
- Automatic SQLite database creation and seed data loading on application startup.
- German article practice for noun genders: `der`, `die`, and `das`.
- Dockerfile and Docker Compose setup for local containerized runs.
- Zero runtime Python package dependencies; the app uses only the Python standard library.

## Run with Docker Compose

```bash
docker compose up --build
```

The application will be available at <http://localhost:8000>.

The Docker Compose setup stores the SQLite database in a named volume so vocabulary data persists between container restarts.

## Run locally without Docker

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

By default, the application creates `words.db` in the project root. To use a different database path, set the `APP_DB_PATH` environment variable:

```bash
APP_DB_PATH=/tmp/de-eng-words.db python -m app.main
```

You can also override the host and port with `APP_HOST` and `APP_PORT`.

## API

- `GET /api/categories` — returns the available word categories.
- `GET /api/words?category=noun` — returns words from the selected category.
- `GET /api/words/random` — returns a random word from all categories.
- `GET /api/words/random?category=verb` — returns a random word from a selected category.
- `GET /api/articles/random` — returns a noun for German article practice.
- `POST /api/articles/check` — checks an article answer.

Example article-check request body:

```json
{
  "word_id": 1,
  "article": "der"
}
```

## Project structure

```text
app/main.py          # HTTP server, SQLite initialization, seed data, API, and HTML UI
Dockerfile           # Container image definition
docker-compose.yml   # Local container orchestration with persistent SQLite volume
requirements.txt     # Runtime dependency note
```
