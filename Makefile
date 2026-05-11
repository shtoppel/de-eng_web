.PHONY: run test compile docker-up docker-down

run:
	python -m app.main

compile:
	python -m compileall app tests

test:
	python -m unittest discover -s tests -v

docker-up:
	docker compose up --build

docker-down:
	docker compose down
