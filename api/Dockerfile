# Build context is the repo root so we can install the pipeline package too.
FROM python:3.12-slim

WORKDIR /app
COPY pipeline /app/pipeline
COPY api /app/api

RUN pip install --no-cache-dir -e /app/pipeline \
    && pip install --no-cache-dir -r /app/api/requirements.txt

WORKDIR /app/api
EXPOSE 8099
CMD ["uvicorn", "athena_api.main:app", "--host", "0.0.0.0", "--port", "8099"]
