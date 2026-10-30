"""Гистология и ИГХ на CPU: ядра на срезе H&E и индекс Ki-67.

Тот же метод, что в браузерной версии BOPASI: цветовая деконволюция
(Ruifrok & Johnston, 2001; skimage.color.rgb2hed), порог Оцу по каналу ядер,
центры ядер — локальные максимумы сглаженного канала, области — водораздел.
Ki-67: ядро положительное, если оно в среднем скорее коричневое (DAB), чем синее.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import color, feature, filters, measure, segmentation

from ..registry import BadInput, Progress, Tool, ToolInfo, register

IMG = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".bmp"]
MAX_SIDE = 4000


def _read(path: Path) -> np.ndarray:
    try:
        im = Image.open(path)
        im.thumbnail((MAX_SIDE, MAX_SIDE))
        return np.asarray(im.convert("RGB"), dtype=np.uint8)
    except Exception as e:  # noqa: BLE001 — любой сбой чтения — плохой файл
        raise BadInput(f"{path.name}: не удалось открыть изображение ({e})") from e


def detect(rgb: np.ndarray, kind: str, sens: float = 1.0, radius: float = 0.0, dab_thr: float = 0.0) -> dict:
    hed = color.rgb2hed(rgb)
    if kind == "dab":
        od = -np.log10((rgb.astype(np.float32) + 1) / 256).sum(axis=2)
        chan = od
    else:
        chan = np.clip(hed[..., 0], 0, None)
    sm = filters.gaussian(chan, sigma=1)
    thr = filters.threshold_otsu(sm[::2, ::2]) / max(sens, 1e-3)
    mask = sm > thr
    lab0 = measure.label(mask)
    if not radius:
        areas = np.sort([r.area for r in measure.regionprops(lab0) if r.area >= 12])
        med = areas[int(len(areas) * 0.4)] if len(areas) else 80
        radius = float(np.clip(np.sqrt(med / np.pi), 3, 40))
    smr = filters.gaussian(chan, sigma=max(1.0, radius * 0.45))
    peaks = feature.peak_local_max(smr, min_distance=max(2, int(radius * 0.8)), labels=lab0, threshold_abs=thr)
    markers = np.zeros(mask.shape, dtype=np.int32)
    markers[tuple(peaks.T)] = np.arange(1, len(peaks) + 1)
    dist = ndi.distance_transform_edt(mask)
    labels = segmentation.watershed(-dist, markers, mask=mask)
    min_area = np.pi * radius * radius * 0.18
    brown = (rgb[..., 0].astype(np.float32) - rgb[..., 2].astype(np.float32)) / 255
    nuclei = []
    for r in measure.regionprops(labels, intensity_image=brown):
        if r.area < min_area:
            continue
        y, x = r.centroid
        q = {"x": round(float(x), 1), "y": round(float(y), 1), "area_px": int(r.area)}
        if kind == "dab":
            q["brown"] = round(float(r.intensity_mean), 4)
            q["positive"] = bool(r.intensity_mean > dab_thr)
        nuclei.append(q)
    return {"radius_px": round(radius, 2), "threshold": float(thr), "nuclei": nuclei}


def summarise(res: dict, kind: str, um_per_px: float) -> dict:
    a = np.array([q["area_px"] for q in res["nuclei"]], dtype=float)
    n = len(a)
    out = {"nuclei": n}
    if n:
        med = float(np.median(a))
        out.update(
            area_px_mean=round(float(a.mean()), 1),
            area_px_sd=round(float(a.std(ddof=1)) if n > 1 else 0.0, 1),
            area_cv=round(float(a.std(ddof=1) / a.mean()) if n > 1 else 0.0, 3),
            large_nuclei=int((a > 2 * med).sum()),
        )
        if um_per_px > 0:
            k2 = um_per_px**2
            out["area_um2_mean"] = round(float(a.mean() * k2), 1)
    if kind == "dab":
        pos = sum(1 for q in res["nuclei"] if q.get("positive"))
        out["positive"] = pos
        out["ki67_index_pct"] = round(100 * pos / n, 1) if n else 0.0
    return out


class _Histo(Tool):
    kind = "he"

    def run(self, files: list[Path], params: dict, progress: Progress) -> dict:
        um = float(params.get("um_per_px", 0) or 0)
        per_file, total = [], {"nuclei": 0, "positive": 0}
        for i, f in enumerate(files):
            progress(i / len(files), f"{f.name}")
            rgb = _read(f)
            res = detect(rgb, self.kind, float(params.get("sensitivity", 1.0)), float(params.get("radius_px", 0) or 0),
                         float(params.get("dab_threshold", 0.0)))
            s = summarise(res, self.kind, um)
            if um > 0:
                s["density_per_mm2"] = round(s["nuclei"] / (rgb.shape[0] * rgb.shape[1] * um * um / 1e6), 0)
            per_file.append({"file": f.name, "size": [int(rgb.shape[1]), int(rgb.shape[0])], "summary": s, "nuclei": res["nuclei"]})
            total["nuclei"] += s["nuclei"]
            total["positive"] += s.get("positive", 0)
        progress(1.0, "готово")
        summary = {"nuclei": total["nuclei"]}
        if self.kind == "dab":
            summary["positive"] = total["positive"]
            summary["ki67_index_pct"] = round(100 * total["positive"] / total["nuclei"], 1) if total["nuclei"] else 0.0
        return {"summary": summary, "files": per_file,
                "method": "colour deconvolution (Ruifrok & Johnston 2001) + Otsu + watershed"}


@register
class HENuclei(_Histo):
    kind = "he"
    info = ToolInfo(
        name="he-nuclei", section="histology",
        title={"ru": "Ядра на срезе H&E", "kk": "H&E кесіндісіндегі ядролар", "en": "Nuclei on H&E sections"},
        accepts=IMG, max_files=20,
        params={"um_per_px": 0.0, "sensitivity": 1.0, "radius_px": 0},
        source="Ruifrok & Johnston, Anal Quant Cytol Histol 2001",
    )


@register
class Ki67(_Histo):
    kind = "dab"
    info = ToolInfo(
        name="ki67", section="oncology",
        title={"ru": "Индекс Ki-67", "kk": "Ki-67 индексі", "en": "Ki-67 index"},
        accepts=IMG, max_files=20,
        params={"sensitivity": 1.0, "radius_px": 0, "dab_threshold": 0.0},
        source="Ruifrok & Johnston, Anal Quant Cytol Histol 2001",
    )
