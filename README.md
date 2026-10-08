# Magauiya: ver. inner peace 1.0 C

**RU** · [KZ](#қазақша) · [EN](#english)

Анализ спермы по видео в счётной камере Маклера: концентрация, подвижность по ВОЗ-5 (PR/NP/IM) и ВОЗ-6 (a/b/c/d), кинематика (VCL, VSL, VAP, LIN, STR, WOB, ALH, BCF) и процентили относительно фертильных мужчин (ВОЗ 2021). Интерфейс на казахском, русском и английском.

> ⚠️ Исследовательский инструмент, не сертифицированное медицинское изделие. Результаты не заменяют анализ эякулята в лаборатории и консультацию врача.

Обратная связь: **Alikhan Magauiya**, orda.ezhenid@gmail.com

## Быстрый старт

**В браузере (без установки).** Скачайте `web/Magauiya.html` и откройте двойным щелчком в Chrome или Edge. Видео обрабатывается на вашем компьютере и никуда не отправляется. Онлайн-версия: `https://<ваш-логин>.github.io/<репозиторий>/` (после включения GitHub Pages, см. ниже).

**На Python.**

```bash
cd python
pip install -r requirements.txt
python spermcasa.py video.mp4            # HTML-отчёт, CSV, JSON и видео с разметкой
```

В Windows можно перетащить видео на `run_analysis.bat`. Для видео с разметкой нужен [FFmpeg](https://ffmpeg.org).

## Структура

| Путь | Что это |
|---|---|
| `web/Magauiya.html` | Готовое приложение одним файлом, работает без интернета |
| `web/index.html` | Версия для сайта (GitHub Pages и т. п.) |
| `web/*.js`, `app_body.html`, `model.json` | Исходники веб-версии; `python3 build.py` → `index.html`, `python3 build.py --offline` → `Magauiya.html` |
| `python/spermcasa.py` | Конвейер анализа: компенсация сдвига столика, калибровка по сетке, детекция, трекинг, отсев дебриса, классы ВОЗ |
| `python/headclf.py`, `head_model.pkl` | Классификатор «головка / дебрис» (градиентный бустинг) |
| `python/train_classifier.py` | Дообучение классификатора на своей разметке |
| `python/load_results.py` | Загрузка экспортированного JSON в pandas |

## Как это работает

1. Сдвиг изображения между кадрами — фазовая корреляция по сетке камеры.
2. Масштаб — по шагу сетки Маклера (100 мкм).
3. Головки сперматозоидов — морфологические преобразования black-hat / top-hat.
4. Траектории — венгерский алгоритм назначения.
5. Дебрис отсеивается классификатором по внешнему виду объекта.
6. Скорость продвижения — медиана смещения сглаженной траектории за 1 с; классы: a ≥ 25 мкм/с, b 5–25 мкм/с, c — движение без продвижения, d — неподвижные.
7. Концентрация — по всей видимой площади неподвижных кадров (глубина камеры 10 мкм), 95% ДИ — по разбросу между полями зрения.

**Процентиль** — доля фертильных мужчин (беременность у партнёрши в течение 12 месяцев) с более низким значением показателя (Campbell et al., Andrology 2021). Это **не** вероятность зачатия.

## Версии классификатора

| Версия | Обучение | Проверка на невиденных видео |
|---|---|---|
| v1.0 | 256 объектов из 7 видео | 88,1% точности на 46 новых видео |
| v1.1 | 578 объектов из 53 видео | 91,1% точности (AUC 0,974), перекрёстная проверка по видео |

Текущая версия в `python/head_model.pkl` и `web/model.json` — **v1.1**. Разметка выполнена одним разметчиком и требует проверки специалистом.

## Ограничения

- Не проведена валидация по сравнению с ручным подсчётом.
- Классификатор обучен на небольшой выборке; для других микроскопов и камер может понадобиться дообучение (`train_classifier.py`). Обучающие данные в репозиторий не включены.
- При 30 кадрах/с значения VCL, ALH и BCF занижены; для классов a/b нужна запись при 37 °C.

## Размещение на GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, папка `/ (root)` → Save. Корневой `index.html` перенаправляет на `web/index.html`.

## Лицензия

Код — [MIT](LICENSE). Библиотека `web/mp4box.all.min.js` — [MP4Box.js](https://github.com/gpac/mp4box.js) (BSD-3-Clause).

---

## Қазақша

Маклер санау камерасындағы бейне бойынша сперманы талдау: концентрация, ДДҰ-5 (PR/NP/IM) және ДДҰ-6 (a/b/c/d) бойынша қозғалғыштық, кинематика және фертильді ерлерге қатысты процентильдер (ДДҰ 2021). Интерфейс қазақ, орыс және ағылшын тілдерінде.

> ⚠️ Зерттеу құралы, сертификатталған медициналық бұйым емес.

**Браузерде:** `web/Magauiya.html` файлын жүктеп алып, Chrome немесе Edge-де ашыңыз. Бейне сіздің компьютеріңізде өңделеді және ешқайда жіберілмейді.
**Python-да:** `cd python && pip install -r requirements.txt && python spermcasa.py video.mp4`.

Процентиль — жүктілік ықтималдығы **емес**, фертильді ерлер арасындағы орны.

Кері байланыс: **Alikhan Magauiya**, orda.ezhenid@gmail.com

---

## English

Video-based semen analysis in a Makler counting chamber: concentration, motility by WHO 5th (PR/NP/IM) and 6th edition (a/b/c/d), kinematics and percentiles relative to fertile men (WHO 2021). Interface in Kazakh, Russian and English.

> ⚠️ Research tool, not a certified medical device.

**Browser:** download `web/Magauiya.html` and open it in Chrome or Edge. Video is processed locally and never uploaded.
**Python:** `cd python && pip install -r requirements.txt && python spermcasa.py video.mp4`.

A percentile is the position among fertile men (time to pregnancy ≤ 12 months), **not** a probability of conception.

Contact: **Alikhan Magauiya**, orda.ezhenid@gmail.com
