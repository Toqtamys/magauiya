# Сервер BOPASI: API и CPU-воркер
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 BOPASI_DATA_DIR=/data
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY models.yaml ./
COPY wrappers ./wrappers
RUN useradd -m bopasi && mkdir -p /data && chown bopasi /data
USER bopasi
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
