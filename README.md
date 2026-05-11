# DE-ENG Vocabulary Trainer

Небольшой веб-тренажёр немецко-английских слов с SQLite-базой, меню по категориям и отдельной тренировкой немецких артиклей.

## Возможности

- категории слов: существительные, глаголы, прилагательные, наречия;
- случайный режим по всем словам;
- автозаполнение SQLite-базы начальными словами при старте;
- тренировка артиклей `der`, `die`, `das` для немецких существительных;
- Dockerfile и Docker Compose для локального запуска.

## Запуск через Docker Compose

```bash
docker compose up --build
```

Приложение будет доступно по адресу <http://localhost:8000>.

## Локальный запуск без Docker

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

По умолчанию база создаётся в `words.db`. Для другого пути задайте переменную окружения `APP_DB_PATH`.

## API

- `GET /api/categories` — список категорий;
- `GET /api/words?category=noun` — слова выбранной категории;
- `GET /api/words/random` — случайное слово;
- `GET /api/articles/random` — вопрос для тренировки артикля;
- `POST /api/articles/check` — проверка ответа, тело: `{ "word_id": 1, "article": "der" }`.
