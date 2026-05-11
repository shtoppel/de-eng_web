# DE-ENG Vocabulary Trainer

A small German-English vocabulary trainer with a SQLite database, category-based practice modes, random word practice, and a dedicated German article trainer.

## Features

- Flag-backed practice arena with separate English, German, and article modes.
- English mode shows a German prompt in the center and English answer choices around it.
- German mode shows an English prompt in the center and German answer choices around it.
- Article mode uses a German flag background and `der`, `die`, `das` answer choices.
- Word categories for nouns, verbs, adjectives, and adverbs.
- Random mode across the full vocabulary database.
- Automatic SQLite database creation and seed data loading on application startup.
- Seed vocabulary stored in `data/seed_words.json` so the word list can be edited without touching server code.
- German article practice for noun genders: `der`, `die`, and `das`.
- Fully redesigned static frontend with flag backgrounds, animated answer arena, scoring, and round controls.
- Custom word form and `POST /api/words` endpoint for extending the local vocabulary.
- Health endpoint for container and deployment checks.
- GitHub Actions CI for compile checks, tests, and Docker image builds.
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

## Common commands

```bash
make run       # Start the local server
make compile   # Compile-check Python files
make test      # Run unit and HTTP smoke tests
make docker-up # Build and run with Docker Compose
```

## API

- `GET /health` — returns service health status.
- `GET /api/categories` — returns the available word categories.
- `GET /api/words?category=noun` — returns words from the selected category.
- `GET /api/words/random` — returns a random word from all categories.
- `GET /api/words/random?category=verb` — returns a random word from a selected category.
- `GET /api/articles/random` — returns a noun for German article practice.
- `POST /api/articles/check` — checks an article answer.
- `POST /api/words` — adds a custom word to the SQLite database.

Example article-check request body:

```json
{
  "word_id": 1,
  "article": "der"
}
```

Example custom-word request body:

```json
{
  "category": "noun",
  "german": "Tisch",
  "english": "table",
  "article": "der",
  "example": "Der Tisch ist rund."
}
```

## Project structure

```text
app/main.py             # Application entrypoint
app/server.py           # HTTP server, routing, JSON helpers, and static file serving
app/database.py         # SQLite initialization, queries, and article-check logic
app/vocabulary.py       # Category metadata and seed-data validation
app/config.py           # Environment-based configuration
app/static/index.html   # Frontend markup
app/static/styles.css   # Frontend styles
app/static/app.js       # Frontend behavior
.github/workflows/ci.yml # CI compile, test, and Docker build workflow
data/seed_words.json    # Initial vocabulary data
Dockerfile              # Container image definition
docker-compose.yml      # Local container orchestration with persistent SQLite volume
requirements.txt        # Runtime dependency note
tests/                  # Unit and HTTP smoke tests
```
