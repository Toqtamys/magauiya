# Сервер BOPASI

FastAPI + Celery + Redis. Принимает снимки и видео, ставит анализ в очередь, запускает модели на CPU или GPU и отдаёт результат в JSON, CSV или текстом.

Сайт BOPASI работает и без сервера: 20 инструментов считают прямо в браузере. Сервер нужен для тяжёлых нейросетей — time-lapse эмбрионов, сегментации ядер, дизайна белков.

## Запуск

С видеокартой NVIDIA (нужен NVIDIA Container Toolkit):

```bash
docker compose up -d --build
```

Без видеокарты:

```bash
docker compose up -d --build api worker-cpu redis
```

API будет на `http://<сервер>:8000`. Адрес вставляется на сайте в поле «Сервер BOPASI» на странице любого серверного инструмента.

Для разработки без Docker и Redis:

```bash
pip install -r requirements-dev.txt
BOPASI_EAGER=1 uvicorn app.main:app --reload
python -m pytest tests
```

## API

| Метод | Путь | Что делает |
| --- | --- | --- |
| POST | `/api/upload` | загрузка файла (multipart, поле `file`) → `{file_id}` |
| POST | `/api/analyze/{tool_name}` | `{file_ids: [...], params: {...}}` → `{task_id}` |
| GET | `/api/status/{task_id}` | `queued` / `running` / `done` / `error`, прогресс 0–1 |
| GET | `/api/result/{task_id}` | результат JSON |
| GET | `/api/report/{task_id}?format=json\|csv\|txt` | отчёт для скачивания |
| GET | `/api/tools` | инструменты и доступны ли они на этом сервере (и почему нет) |
| GET | `/api/health` | состояние, наличие CUDA |

## Инструменты

Работают сразу, на CPU:

- `he-nuclei` — ядра на срезе H&E: число, плотность на мм², площадь, вариабельность;
- `ki67` — индекс Ki-67 на ИГХ (DAB + гематоксилин).

Подключаются через `models.yaml` после установки репозитория и весов в `/opt/models/<name>`:

| Имя | Модель | Раздел |
| --- | --- | --- |
| `bela` | STORK-V / BELA — плоидность и качество бластоцисты по time-lapse | эмбриология |
| `embryovision` | морфология по кадрам EmbryoScope | эмбриология |
| `emlife` | вероятность живорождения по time-lapse | эмбриология |
| `scd-dl` | нейросетевая классификация гало SCD | андрология |
| `pycasa` | CASA по видео | андрология |
| `hovernet` | HoVer-Net, типы ядер PanNuke | онкология |
| `protein-design` | RFdiffusion + ProteinMPNN | препараты и белки |
| `pocketdock` | докинг в карман белка | препараты и белки |

Пока модели нет, `/api/tools` показывает её с `available: false` и причиной, а `/api/analyze` отвечает 503.

## Как добавить модель

1. Склонируйте репозиторий модели в `/opt/models/<name>` и скачайте веса по его README.
2. Скопируйте `wrappers/template.py` туда же как `run_bopasi.py` и вызовите модель в `predict()`. Обёртка читает `--input`/`--inputs`, пишет JSON в `--output` и печатает `PROGRESS 0.5 текст`.
3. Добавьте или поправьте запись в `models.yaml` (раздел, названия на трёх языках, форматы файлов, `gpu: true/false`).
4. Перезапустите `api` и воркеры.

Модель на Python можно подключить и напрямую — подклассом `Tool` с декоратором `@register` (пример: `app/tools/histology.py`). Модель загружается лениво, при первой задаче, и остаётся в памяти воркера.

## Настройки (переменные окружения)

| Переменная | По умолчанию | |
| --- | --- | --- |
| `BOPASI_REDIS_URL` | `redis://localhost:6379/0` | брокер очереди |
| `BOPASI_DATA_DIR` | `./data` | загрузки и результаты |
| `BOPASI_MAX_UPLOAD_MB` | `4096` | предел размера файла |
| `BOPASI_TTL_HOURS` | `24` | сколько хранить файлы и результаты |
| `BOPASI_CORS` | сайт на GitHub Pages и localhost | откуда разрешены запросы |
| `BOPASI_DEVICE` | авто | `cuda`, `cuda:1` или `cpu` |
| `BOPASI_EAGER` | `0` | `1` — без Redis, задачи в процессе API |

Загруженные файлы удаляются через `BOPASI_TTL_HOURS` (сервис `cleanup` в docker-compose). Для работы с данными пациентов разворачивайте сервер внутри сети клиники и включайте HTTPS на обратном прокси.
