# De-Eng Vocabulary Trainer

A small German-English vocabulary trainer with a Python standard-library API, SQLite persistence, a plain HTML + TypeScript frontend, and Nginx static serving/proxying for Docker runs.

## Features

- Vocabulary practice with category filtering for nouns, verbs, adjectives, and adverbs.
- English mode (German prompt → English answer) and German mode (English prompt → German answer).
- German article trainer with `der`, `die`, and `das` choices.
- Multichoice and typed-card practice styles, with article mode locked to multichoice.
- Score, answered-count, accuracy, round, deck-size, reset, skip, and show-answer controls.
- Favorites mode stored in the browser for starring words and practicing only favorites.
- Custom word form backed by `POST /api/words` so vocabulary is stored in SQLite, not hardcoded in the frontend.
- Seed vocabulary remains in `data/seed_words.json`; startup creates/seeds `words.db` when the database is missing or empty.
- Docker Compose starts the backend, builds the TypeScript frontend into `frontend/dist`, and serves it with Nginx at <http://localhost:8080>.

## URLs

- Public app through Nginx: <http://localhost:8080>
- Backend API directly: <http://localhost:8000>
- Health check through Nginx: <http://localhost:8080/health>
- Health check directly: <http://localhost:8000/health>

## Run with Docker Compose

```bash
docker compose up --build
```

Compose starts three services:

- `backend` — Python standard-library API on port `8000` inside Docker and published to `localhost:8000`.
- `frontend-build` — Node build container that writes the TypeScript build output to `frontend/dist` in a Docker volume.
- `nginx` — serves the built frontend and proxies `/api/*` plus `/health` to `backend`; published to `localhost:8080`.

The SQLite database is stored in the named Docker volume `words-data`, so custom words persist between container restarts.

Useful Docker commands:

```bash
docker compose up --build       # Build and start the full app
docker compose down             # Stop containers and keep volumes
docker compose down -v          # Stop containers and remove persisted SQLite data
docker compose logs -f backend  # Follow backend logs
docker compose logs -f nginx    # Follow Nginx logs
```

## Local development without Docker

Build the frontend first, then run the backend:

```bash
cd frontend
npm run build
cd ..
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

Local URLs after those commands:

- Frontend served by the Python development server: <http://localhost:8000>
- Backend API: <http://localhost:8000/api/words>
- Health endpoint: <http://localhost:8000/health>

By default, the application creates `words.db` in the project root. To use a different database path, set `APP_DB_PATH`:

```bash
APP_DB_PATH=/tmp/de-eng-words.db python -m app.main
```

You can also override the backend bind address and port with `APP_HOST` and `APP_PORT`.

## Frontend development

The frontend is plain HTML + TypeScript with no React, Vue, Angular, or Node.js backend. Source files live in `frontend/src`, and the build output goes to `frontend/dist`.

```bash
cd frontend
npm run build   # Compile/copy static assets into frontend/dist
npm run check   # Type-check with tsc when TypeScript is installed locally
```

The TypeScript code is split by responsibility:

- `api.ts` — fetch helpers, API payloads, and vocabulary types.
- `state.ts` — app state, favorites persistence, answer normalization, and deck helpers.
- `ui.ts` — DOM references, visual updates, category counts, and input state.
- `game.ts` — practice rounds, scoring, article trainer, custom words, and event handlers.
- `main.ts` — frontend entrypoint.

## Common commands

```bash
make run       # Start the local Python server
make compile   # Compile-check Python files
make test      # Run unit and HTTP smoke tests
make docker-up # Build and run with Docker Compose
```

Additional validation commands:

```bash
python -m unittest
npm --prefix frontend run build
docker compose config
```

## API

The Python backend API is preserved and continues to listen on port `8000` inside Docker.

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
app/main.py                  # Backend entrypoint
app/server.py                # Python HTTP server, API routing, JSON helpers, local static serving
app/database.py              # SQLite initialization, queries, seed loading, and article-check logic
app/vocabulary.py            # Category metadata and seed-data validation
app/config.py                # Environment-based backend configuration and frontend/dist lookup
data/seed_words.json         # Initial vocabulary data used to seed SQLite
frontend/package.json        # Frontend build/check scripts
frontend/tsconfig.json       # TypeScript compiler settings
frontend/src/index.html      # Frontend markup
frontend/src/styles.css      # Frontend styles
frontend/src/api.ts          # API module
frontend/src/state.ts        # State module
frontend/src/ui.ts           # UI/DOM module
frontend/src/game.ts         # Game/trainer logic module
frontend/src/main.ts         # Frontend entrypoint
frontend/dist/               # Built frontend served by Nginx and local backend dev server
nginx/nginx.conf             # Nginx static server and backend proxy configuration
Dockerfile                   # Backend container image definition
docker-compose.yml           # Backend, frontend-build, Nginx, and persistent SQLite volume
requirements.txt             # Runtime dependency note
tests/                       # Unit and HTTP smoke tests
```
