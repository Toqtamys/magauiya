import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
TMP = Path(tempfile.mkdtemp(prefix="bopasi-test-"))
os.environ.setdefault("BOPASI_DATA_DIR", str(TMP / "data"))
os.environ["BOPASI_EAGER"] = "1"

# models.yaml для тестов: «модель» — tests/fake_model.py, запускается текущим Python
fake = ROOT / "tests" / "fake_model.py"
(TMP / "models.yaml").write_text(f"""tools:
  - name: fake
    section: andrology
    title: {{ru: "Тест"}}
    accepts: [.bin]
    command: ["{sys.executable}", "{fake}", --input, "{{input}}", --output, "{{output}}", --fail, "{{fail}}"]
    params: {{fail: "0"}}
  - name: missing
    section: embryology
    title: {{ru: "Нет весов"}}
    accepts: [.mp4]
    gpu: true
    requires: [/nonexistent/weights]
    command: [python3, x.py]
""", encoding="utf-8")
os.environ["BOPASI_MODELS_FILE"] = str(TMP / "models.yaml")
