# Модели BOPASI

## scd-yolov8s-seg.onnx — сегментация клеток SCD-теста

- Источник: «Sperm chromatin dispersion microscopy image dataset for instance segmentation»,
  E. J. Ornelas Nande, M. A. Adel Domínguez, A. Mora Topete, L. E. Magdaleno Márquez, I. Aranguren,
  A. Valdivia-G, O. D. Sanchez. Zenodo, 2026. https://zenodo.org/records/21628868 — лицензия CC BY 4.0.
- Исходный файл: `model/best_yolov8s_seg_scd.pt` (YOLOv8s-seg, imgsz 1024, 100 эпох; на проверочной выборке
  авторов mAP50 масок 0.91, точность 0.86, полнота 0.82).
- Классы: 0 — фрагментирована (Fragmentado), 1 — не фрагментирована (No fragmentado).
- Архитектура и код обучения — Ultralytics YOLOv8, лицензия AGPL-3.0 (https://ultralytics.com/license).
  Сайт BOPASI открыт целиком (этот репозиторий), что согласуется с AGPL-3.0.
- Преобразование: экспорт в ONNX (opset 17, вход 1×3×1024×1024), веса сохранены в float16
  с приведением к float32 при загрузке (24 МБ вместо 45 МБ; расхождение выходов < 0.1%).

## visem-yolov5n.onnx — детектор сперматозоидов для спермограммы по видео

- Источник: VISEM-Tracking, SimulaMet (Thambawita V., Hicks S. A., Storås A. M. и др.
  «VISEM-Tracking, a human spermatozoa tracking dataset», Scientific Data, 2023).
  Веса: `best_checkpoints/yolov5n/weights/best.pt`, https://huggingface.co/datasets/SimulaMet-HOST/VISEM-Tracking — лицензия CC BY 4.0.
- Архитектура YOLOv5n (Ultralytics, AGPL-3.0). Классы: 0 — сперматозоид, 1 — скопление, 2 — мелкая головка.
- Преобразование: экспорт в ONNX (opset 17, вход 1×3×H×W, H и W кратны 32), веса в float16 (3,8 МБ).
- Обучена на видео с тёмным фоном (светлые головки). Видео со светлым фоном BOPASI переводит в негатив,
  но точность на них ниже — поэтому для режима нейросети просим загружать видео на тёмном фоне.

## scd-centernet-r18.onnx — нейросеть ×20 для SCD-теста (центр головки, малая ось, гало)

- Источник весов: `pretrained/model70.pt` из репозитория scd-resnet (Zheng Yang, 2023, лицензия BSD-3-Clause),
  «Gaussian clustering and quantification of sperm chromatin dispersion test using convolutional neural network».
- Обучающие данные: «Sperm chromatin dispersion bright field images», Mendeley Data, 2023,
  doi:10.17632/p3ntt2z294.1 — 130 полей 3072×2048, объектив ×20, окраска Райт-Гимза; лицензия CC BY 4.0.
- Архитектура: CenterNet с ResNet-18; вход 1×1×512×512 (серый, нормированный по плитке), выход 10×1×100:
  уверенность, индекс, y, x, вектор большой оси, малая ось, поперечник с гало, смещение (сетка с шагом 4 пикс.).
- Rhr = (поперечник − малая ось) / (2 · малая ось) — толщина гало относительно малой оси ядра;
  BOPASI относит клетку к классам Fernández: ≥ 1 — большое, > 1/3 — среднее, > 0,05 — малое, иначе — без гало.
- Преобразование: TorchScript → ONNX (opset 17), расхождение выходов с исходной моделью < 3·10⁻⁵.
- Снимок масштабируется так, чтобы поле соответствовало кадру 3072 пикс., и обрабатывается плитками 512 с перекрытием 64.
