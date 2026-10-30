import io
import time

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import app

client = TestClient(app)


def wait(tid, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = client.get(f"/api/status/{tid}").json()
        if s["status"] in ("done", "error"):
            return s
        time.sleep(0.1)
    raise AssertionError("timeout")


def upload(name, data):
    r = client.post("/api/upload", files={"file": (name, data)})
    assert r.status_code == 200, r.text
    return r.json()["file_id"]


def slide(kind, n=40, pos=10, seed=1):
    rng = np.random.default_rng(seed)
    im = Image.new("RGB", (500, 400), (241, 199, 218) if kind == "he" else (238, 240, 243))
    d = ImageDraw.Draw(im)
    pts = []
    while len(pts) < n:
        x, y = rng.uniform(20, 480), rng.uniform(20, 380)
        if all((x - a) ** 2 + (y - b) ** 2 > 22 ** 2 for a, b in pts):
            pts.append((x, y))
    for i, (x, y) in enumerate(pts):
        col = (80, 50, 130) if kind == "he" else ((130, 75, 40) if i < pos else (100, 110, 170))
        d.ellipse([x - 8, y - 7, x + 8, y + 7], fill=col)
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def test_health_and_tools():
    assert client.get("/api/health").json()["ok"]
    tools = {t["name"]: t for t in client.get("/api/tools").json()["tools"]}
    assert tools["ki67"]["available"] and tools["he-nuclei"]["available"]
    assert tools["fake"]["available"]
    assert not tools["missing"]["available"] and "/nonexistent/weights" in tools["missing"]["reason"]


def test_ki67_end_to_end():
    fid = upload("ki.png", slide("dab", 40, 10))
    r = client.post("/api/analyze/ki67", json={"file_ids": [fid]})
    assert r.status_code == 202
    tid = r.json()["task_id"]
    assert wait(tid)["status"] == "done"
    res = client.get(f"/api/result/{tid}").json()["result"]["summary"]
    assert res["nuclei"] == 40 and res["positive"] == 10 and res["ki67_index_pct"] == 25.0
    csv = client.get(f"/api/report/{tid}?format=csv").text
    assert "ki67_index_pct,25.0" in csv


def test_he_counts():
    fid = upload("he.png", slide("he", 55))
    tid = client.post("/api/analyze/he-nuclei", json={"file_ids": [fid], "params": {"um_per_px": 0.5}}).json()["task_id"]
    assert wait(tid)["status"] == "done"
    s = client.get(f"/api/result/{tid}").json()["result"]["files"][0]["summary"]
    assert s["nuclei"] == 55 and "density_per_mm2" in s


def test_command_tool_and_errors():
    fid = upload("x.bin", b"12345")
    tid = client.post("/api/analyze/fake", json={"file_ids": [fid]}).json()["task_id"]
    assert wait(tid)["status"] == "done"
    assert client.get(f"/api/result/{tid}").json()["result"]["summary"]["bytes"] == 5
    tid = client.post("/api/analyze/fake", json={"file_ids": [fid], "params": {"fail": "1"}}).json()["task_id"]
    s = wait(tid)
    assert s["status"] == "error" and "weights are broken" in s["error"]
    assert client.get(f"/api/result/{tid}").status_code == 422


def test_rejections():
    fid = upload("x.bin", b"1")
    assert client.post("/api/analyze/missing", json={"file_ids": [fid]}).status_code == 503
    assert client.post("/api/analyze/nope", json={"file_ids": [fid]}).status_code == 404
    assert client.post("/api/analyze/ki67", json={"file_ids": [fid]}).status_code == 422      # .bin не изображение
    assert client.post("/api/analyze/ki67", json={"file_ids": ["0" * 32]}).status_code == 404
    assert client.get("/api/status/../../etc").status_code == 404
    assert client.post("/api/upload", files={"file": ("e.png", b"")}).status_code == 400
    bad = upload("bad.png", b"not an image")
    tid = client.post("/api/analyze/ki67", json={"file_ids": [bad]}).json()["task_id"]
    s = wait(tid)
    assert s["status"] == "error" and "не удалось открыть" in s["error"]


def test_params_cannot_override_paths():
    fid = upload("x.bin", b"123")
    tid = client.post("/api/analyze/fake", json={"file_ids": [fid], "params": {"output": "/tmp/evil.json", "input": "/etc/passwd"}}).json()["task_id"]
    assert wait(tid)["status"] == "done"
    assert client.get(f"/api/result/{tid}").json()["result"]["summary"]["bytes"] == 3
