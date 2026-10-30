"use client";
// NiiVue (BSD-2-Clause, github.com/niivue/niivue): объёмные медицинские снимки в браузере
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Camera, FolderOpen, Layers, LayoutGrid, Ruler, SunMedium } from "lucide-react";
import { BASE } from "@/lib/catalog";
import { useDropped } from "@/lib/store";
import { cn } from "@/lib/cn";

type NV = import("@niivue/niivue").Niivue;

export default function NiivueTool() {
  const tr = useTranslations();
  const canvas = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<NV | null>(null);
  const mod = useRef<typeof import("@niivue/niivue") | null>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"multi" | "render" | "axial">("multi");
  const [mode, setMode] = useState<"contrast" | "measure">("measure");
  const [name, setName] = useState("ovary-synthetic.nii.gz");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!canvas.current) return;
      if (!canvas.current.getContext("webgl2")) { setErr(tr("rtNoWebgl")); return; }
      const m = await import("@niivue/niivue");
      if (!alive) return;
      mod.current = m;
      const nv = new m.Niivue({ backColor: [0, 0, 0, 1], crosshairColor: [1, 0.77, 0.2, 1], show3Dcrosshair: true, dragAndDropEnabled: true, isColorbar: false });
      nvRef.current = nv;
      await nv.attachToCanvas(canvas.current);
      nv.setSliceType(m.SLICE_TYPE.MULTIPLANAR);
      nv.setDragMode(m.DRAG_MODE.measurement);
      const dropped = useDropped.getState().take("niivue");
      try {
        if (dropped.length) { await nv.loadFromFile(dropped[0]); setName(dropped[0].name); }
        else await nv.loadVolumes([{ url: `${BASE}/samples/ovary-synthetic.nii.gz`, name: "ovary-synthetic.nii.gz" }]);
      } catch (e) { setErr(`${tr("rtFailed")}: ${String((e as Error)?.message || e)}`); }
    })();
    return () => { alive = false; try { nvRef.current?.cleanup(); } catch {} nvRef.current = null; };
  }, [tr]);

  const setV = (v: typeof view) => { setView(v); const m = mod.current, nv = nvRef.current; if (!m || !nv) return; nv.setSliceType(v === "multi" ? m.SLICE_TYPE.MULTIPLANAR : v === "render" ? m.SLICE_TYPE.RENDER : m.SLICE_TYPE.AXIAL); };
  const setD = (d: typeof mode) => { setMode(d); const m = mod.current, nv = nvRef.current; if (!m || !nv) return; nv.setDragMode(d === "measure" ? m.DRAG_MODE.measurement : m.DRAG_MODE.contrast); };
  const open = async (f?: File) => {
    const nv = nvRef.current;
    if (!f || !nv) return;
    setErr("");
    try { while (nv.volumes.length) nv.removeVolume(nv.volumes[0]); await nv.loadFromFile(f); setName(f.name); }
    catch (e) { setErr(`${tr("rtFailed")}: ${String((e as Error)?.message || e)}`); }
  };
  const sample = async () => {
    const nv = nvRef.current;
    if (!nv) return; setErr("");
    while (nv.volumes.length) nv.removeVolume(nv.volumes[0]);
    await nv.loadVolumes([{ url: `${BASE}/samples/ovary-synthetic.nii.gz`, name: "ovary-synthetic.nii.gz" }]); setName("ovary-synthetic.nii.gz");
  };
  const btn = (on: boolean) => cn("inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-sm font-semibold transition-colors", on ? "bg-blue text-white" : "bg-[#eef2ff] text-ink hover:bg-[#dfe6ff]");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={btn(view === "multi")} onClick={() => setV("multi")}><LayoutGrid className="size-4" />{tr("rtAll")}</button>
        <button className={btn(view === "axial")} onClick={() => setV("axial")}><Layers className="size-4" />{tr("rtSlices")}</button>
        <button className={btn(view === "render")} onClick={() => setV("render")}><Box className="size-4" />{tr("rtVolume")}</button>
        <span className="mx-1 h-6 w-px bg-ink/15" />
        <button className={btn(mode === "measure")} onClick={() => setD("measure")}><Ruler className="size-4" />{tr("rtMeasure")}</button>
        <button className={btn(mode === "contrast")} onClick={() => setD("contrast")}><SunMedium className="size-4" />{tr("rtContrast")}</button>
        <span className="mx-1 h-6 w-px bg-ink/15" />
        <button className={btn(false)} onClick={() => nvRef.current?.saveScene("bopasi-niivue.png")}><Camera className="size-4" />{tr("rtShot")}</button>
        <button className={btn(false)} onClick={() => fileIn.current?.click()}><FolderOpen className="size-4" />{tr("rtOpen")}</button>
        <button className={btn(false)} onClick={sample}>{tr("rtSample")}</button>
        <input ref={fileIn} type="file" hidden accept=".nii,.gz,.nrrd,.nhdr,.mgh,.mgz,.mha,.mhd,.head,.mif" onChange={(e) => open(e.target.files?.[0])} />
      </div>
      <div className="relative h-[min(72vh,640px)] overflow-hidden rounded-[24px] bg-[#0a1240]">
        <canvas ref={canvas} className="size-full" />
      </div>
      <p className="mt-3 font-mono text-sm text-ink/70">{name} · {tr("rtDrop")}</p>
      {err && <p className="mt-3 rounded-2xl bg-[#fff1e6] p-4 text-sm text-[#9a4a12]">{err}</p>}
    </div>
  );
}
