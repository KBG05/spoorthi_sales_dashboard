FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*
# ------------------------

WORKDIR /app

COPY pyproject.toml uv.lock .python-version ./

RUN uv sync --locked

COPY ./app ./app/


CMD ["/bin/sh", "-c", "PYTHONPATH=/app uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]




