"use client";
// SeqViz (MIT, github.com/Lattice-Automation/seqviz): карта ДНК; разбор файлов — seqparse (MIT)
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SeqViz } from "seqviz";
import { parseFile } from "seqparse";
import { FolderOpen, Search } from "lucide-react";
import { BASE } from "@/lib/catalog";
import { useDropped } from "@/lib/store";
import { cn } from "@/lib/cn";

type Seq = { name: string; seq: string; annotations: { name: string; start: number; end: number; direction?: number; color?: string }[] };
const ENZYMES = ["EcoRI", "BamHI", "HindIII", "PstI", "XbaI", "NcoI", "SalI", "KpnI"];

export default function SeqvizTool() {
  const tr = useTranslations();
  const [seq, setSeq] = useState<Seq | null>(null);
  const [viewer, setViewer] = useState<"circular" | "linear" | "both">("both");
  const [enz, setEnz] = useState<string[]>(["EcoRI", "HindIII"]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState(0);
  const [comp, setComp] = useState(true);
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState("");
  const fileIn = useRef<HTMLInputElement>(null);

  const fromText = (txt: string, fileName: string, source?: ArrayBuffer) => {
    try {
      const all = parseFile(txt, { fileName, source }) as unknown as Seq[];
      if (!all?.length || !all[0].seq) throw new Error("no sequence");
      setSeq(all[0]); setErr("");
    } catch (e) { setErr(`${tr("rtFailed")}: ${String((e as Error)?.message || e)}`); }
  };
  const sample = async () => fromText(await (await fetch(`${BASE}/samples/pBAD30.gb`)).text(), "pBAD30.gb");
  useEffect(() => {
    const dropped = useDropped.getState().take("seqviz");
    const f = dropped[0];
    if (f) { if (f.name.toLowerCase().endsWith(".dna")) f.arrayBuffer().then((b) => fromText("", f.name, b)); else f.text().then((t) => fromText(t, f.name)); } else sample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = useMemo(() => (query.trim().length >= 3 ? { query: query.trim(), mismatch: 0 } : undefined), [query]);
  const pill = (on: boolean) => cn("rounded-full px-4 py-2 font-mono text-sm font-semibold transition-colors", on ? "bg-blue text-white" : "bg-[#eef2ff] text-ink hover:bg-[#dfe6ff]");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["both", "circular", "linear"] as const).map((v) => (
          <button key={v} className={pill(viewer === v)} onClick={() => setViewer(v)}>{tr(v === "both" ? "rtBoth" : v === "circular" ? "rtCircular" : "rtLinear")}</button>
        ))}
        <span className="mx-1 h-6 w-px bg-ink/15" />
        <button className={pill(false)} onClick={() => fileIn.current?.click()}><FolderOpen className="mr-1 inline size-4" />{tr("rtOpen")}</button>
        <button className={pill(false)} onClick={sample}>{tr("rtSample")}</button>
        <input ref={fileIn} type="file" hidden accept=".gb,.gbk,.genbank,.fasta,.fa,.fas,.fna,.seq,.txt,.dna,.xml,.sbol"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) { if (f.name.toLowerCase().endsWith(".dna")) fromText("", f.name, await f.arrayBuffer()); else fromText(await f.text(), f.name); } }} />
        <label className="ml-auto inline-flex items-center gap-2 font-mono text-sm text-ink"><input type="checkbox" checked={comp} onChange={(e) => setComp(e.target.checked)} className="size-4 accent-[#1d3fd6]" />{tr("rtComplement")}</label>
      </div>
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-ink/70">{tr("rtEnzymes")}:</span>
          {ENZYMES.map((e) => (
            <button key={e} className={cn("rounded-full px-3 py-1.5 font-mono text-xs font-semibold", enz.includes(e) ? "bg-[#ffc533] text-ink" : "bg-[#eef2ff] text-ink/80 hover:bg-[#dfe6ff]")}
              onClick={() => setEnz((x) => (x.includes(e) ? x.filter((y) => y !== e) : [...x, e]))} aria-pressed={enz.includes(e)}>{e}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2">
          <Search className="size-4 text-blue" />
          <span className="sr-only">{tr("rtSearch")}</span>
          <input value={query} onChange={(e) => setQuery(e.target.value.replace(/[^acgtnACGTN]/g, ""))} placeholder={tr("rtSearch")} className="w-56 bg-transparent font-mono text-sm text-ink outline-none" />
          {search && <span className="font-mono text-xs text-ink/60">{hits} {tr("rtMatches")}</span>}
        </label>
      </div>
      <div className="h-[min(70vh,620px)] overflow-hidden rounded-[24px] border border-ink/10 bg-white">
        {seq && (
          <SeqViz name={seq.name} seq={seq.seq} annotations={seq.annotations} viewer={viewer} enzymes={enz}
            showComplement={comp} search={search} onSearch={(r) => setHits(r.length)} style={{ height: "100%", width: "100%" }} />
        )}
      </div>
      <p className="mt-3 font-mono text-sm text-ink/70">{seq ? `${seq.name} · ${seq.seq.length} ${tr("rtBp")}` : ""}</p>
      <details className="mt-4">
        <summary className="cursor-pointer font-mono text-sm font-semibold text-blue">{tr("rtPaste")}</summary>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-ink/15 p-3 font-mono text-sm text-ink" placeholder=">my_seq&#10;ATGC..." />
        <button className="mt-2 rounded-full bg-blue px-5 py-2 font-mono text-sm font-semibold text-white" onClick={() => fromText(paste.trim().startsWith(">") || paste.includes("LOCUS") ? paste : `>sequence\n${paste}`, "pasted.fasta")}>{tr("rtShow")}</button>
      </details>
      {err && <p className="mt-3 rounded-2xl bg-[#fff1e6] p-4 text-sm text-[#9a4a12]">{err}</p>}
    </div>
  );
}
