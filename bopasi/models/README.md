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
