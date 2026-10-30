"use client";
// Mol* (MIT, github.com/molstar/molstar): структуры белков и молекул; сборка viewer лежит в /molstar
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, Download } from "lucide-react";
import { BASE } from "@/lib/catalog";
import { useDropped } from "@/lib/store";

type Viewer = {
  plugin: { clear: () => Promise<void> | void; dispose?: () => void };
  loadStructureFromData: (data: string | number[], format: string, options?: { dataLabel?: string }) => Promise<void>;
  loadPdb: (id: string) => Promise<void>;
  dispose?: () => void;
};
type MolstarGlobal = { Viewer: { create: (el: HTMLElement, opts: Record<string, unknown>) => Promise<Viewer> } };
declare global { interface Window { molstar?: MolstarGlobal } }

let loading: Promise<void> | null = null;
function loadMolstar() {
  if (window.molstar) return Promise.resolve();
  return (loading ||= new Promise<void>((res, rej) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = `${BASE}/molstar/molstar.css`; document.head.append(css);
    const s = document.createElement("script"); s.src = `${BASE}/molstar/molstar.js`; s.onload = () => res(); s.onerror = () => { loading = null; rej(new Error("molstar.js")); };
    document.head.append(s);
  }));
}
const FORMAT: Record<string, string> = { pdb: "pdb", ent: "pdb", cif: "mmcif", mmcif: "mmcif", bcif: "bcif", sdf: "sdf", mol: "mol", mol2: "mol2", gro: "gro", xyz: "xyz" };

export default function MolstarTool() {
  const tr = useTranslations();
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("4WP4 · Hev b 6.02");
  const [err, setErr] = useState("");

  const loadFile = async (f: File) => {
    const v = viewer.current; if (!v) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase(), fmt = FORMAT[ext];
    if (!fmt) { setErr(`${tr("rtFailed")}: ${f.name}`); return; }
    setErr("");
    try {
      await v.plugin.clear();
      const data = fmt === "bcif" ? Array.from(new Uint8Array(await f.arrayBuffer())) : await f.text();
      await v.loadStructureFromData(data, fmt, { dataLabel: f.name });
      setLabel(f.name);
    } catch (e) { setErr(`${tr("rtFailed")}: ${String((e as Error)?.message || e)}`); }
  };
  const loadSample = async () => {
    const v = viewer.current; if (!v) return;
    await v.plugin.clear();
    const txt = await (await fetch(`${BASE}/samples/4WP4.pdb`)).text();
    await v.loadStructureFromData(txt, "pdb", { dataLabel: "4WP4" });
    setLabel("4WP4 · Hev b 6.02");
  };

  useEffect(() => {
    let alive = true;
    loadMolstar().then(async () => {
      if (!alive || !host.current || !window.molstar) return;
      const v = await window.molstar.Viewer.create(host.current, {
        layoutIsExpanded: false, layoutShowControls: true, layoutShowRemoteState: false, layoutShowSequence: true,
        layoutShowLog: false, layoutShowLeftPanel: true, viewportShowExpand: true, viewportShowSelectionMode: false, viewportShowAnimation: false,
        collapseLeftPanel: true, pdbProvider: "rcsb", emdbProvider: "rcsb",
      });
      if (!alive) { v.dispose?.(); return; }
      viewer.current = v;
      const dropped = useDropped.getState().take("molstar");
      if (dropped.length) await loadFile(dropped[0]); else await loadSample();
    }).catch((e) => setErr(`${tr("rtFailed")}: ${String(e?.message || e)}`));
    return () => { alive = false; try { viewer.current?.dispose?.(); } catch {} viewer.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const btn = "inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 font-mono text-sm font-semibold text-ink transition-colors hover:bg-[#dfe6ff]";
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={btn} onClick={() => fileIn.current?.click()}><FolderOpen className="size-4" />{tr("rtOpen")}</button>
        <button className={btn} onClick={loadSample}>{tr("rtSample")}</button>
        <input ref={fileIn} type="file" hidden accept=".pdb,.ent,.cif,.mmcif,.bcif,.sdf,.mol,.mol2,.gro,.xyz" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
        <form className="ml-auto flex items-center gap-2" onSubmit={async (e) => {
          e.preventDefault(); const id = code.trim(); const v = viewer.current;
          if (!/^[0-9][a-zA-Z0-9]{3}$/.test(id) || !v) return;
          setErr(""); try { await v.plugin.clear(); await v.loadPdb(id.toLowerCase()); setLabel(id.toUpperCase()); } catch (er) { setErr(`${tr("rtFailed")}: ${String((er as Error)?.message || er)}`); }
        }}>
          <label className="sr-only" htmlFor="pdbcode">{tr("rtPdbCode")}</label>
          <input id="pdbcode" value={code} onChange={(e) => setCode(e.target.value)} placeholder={tr("rtPdbCode")} maxLength={4}
            className="w-56 rounded-full border border-ink/15 bg-white px-4 py-2 font-mono text-sm text-ink" />
          <button className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-2 font-mono text-sm font-semibold text-white hover:bg-[#1532b8]"><Download className="size-4" />{tr("rtLoad")}</button>
        </form>
      </div>
      <div ref={host} className="relative h-[min(74vh,680px)] overflow-hidden rounded-[24px]" />
      <p className="mt-3 font-mono text-sm text-ink/70">{label}</p>
      {err && <p className="mt-3 rounded-2xl bg-[#fff1e6] p-4 text-sm text-[#9a4a12]">{err}</p>}
    </div>
  );
}
