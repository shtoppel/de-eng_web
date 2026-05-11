FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_DB_PATH=/data/words.db

WORKDIR /app

COPY . .

RUN mkdir -p /data

EXPOSE 8000

CMD ["python", "-m", "app.main"]
