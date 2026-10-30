"use client";
// Быстрая загрузка: бросьте снимок или видео — сайт предложит подходящие инструменты
// и передаст в них файл. Файл остаётся в браузере.
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { FileImage, FileVideo, RotateCcw, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { SHORT, t } from "@/lib/catalog";
import { useDropped } from "@/lib/store";
import { useLocale } from "./Providers";
import { cn } from "@/lib/cn";

const FOR_IMAGES = ["scd", "bluetol", "he-nuclei", "ki67", "rc-phase", "morphometry"];
const FOR_VIDEO = ["bopasi"];
const BY_EXT: [RegExp, string[]][] = [
  [/\.(nii|nii\.gz|nrrd|nhdr|mgh|mgz|mha|mhd)$/i, ["niivue"]],
  [/\.(pdb|ent|cif|mmcif|bcif|sdf|mol|mol2)$/i, ["molstar"]],
  [/\.(gb|gbk|genbank|fasta|fa|fas|fna|dna)$/i, ["seqviz"]],
];

export function QuickDrop() {
  const tr = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const setDropped = useDropped((s) => s.set);
  const [files, setFiles] = useState<File[]>([]);
  const onDrop = useCallback((accepted: File[]) => setFiles(accepted), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "video/mp4": [], "video/quicktime": [], "video/webm": [],
      "application/octet-stream": [".nii", ".gz", ".nrrd", ".mgz", ".mgh", ".pdb", ".cif", ".bcif", ".sdf", ".mol2", ".gb", ".gbk", ".fasta", ".fa", ".dna"],
      "chemical/x-pdb": [".pdb", ".ent"], "text/plain": [".pdb", ".gb", ".gbk", ".fasta", ".fa", ".sdf", ".mol"] },
  });
  const byExt = files.length ? BY_EXT.find(([re]) => re.test(files[0].name)) : undefined;
  const kind = !files.length ? null : files[0].type.startsWith("video/") ? "video" : files[0].type.startsWith("image/") ? "image" : "data";
  const tools = byExt ? byExt[1] : kind === "video" ? FOR_VIDEO : kind === "image" ? FOR_IMAGES : [];
  const preview = useMemo(() => (kind === "image" ? URL.createObjectURL(files[0]) : null), [files, kind]);
  const open = (id: string) => { setDropped(files, id); router.push(`/t/${id}/`); };

  return (
    <section id="drop" className="mx-auto max-w-[1400px] px-5 pt-28 md:px-12" aria-label={tr("dropTitle")}>
      <AnimatePresence mode="wait">
        {!files.length ? (
          <motion.div key="zone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}>
            <div {...getRootProps({ className: cn(
              "relative flex cursor-pointer flex-col items-center gap-3 border border-dashed px-6 py-16 text-center transition-all focus-visible:outline-2 focus-visible:outline-white",
              isDragActive ? "border-white bg-white/10" : "border-white/30 bg-black/40 hover:border-white") })}>
              <input {...getInputProps()} />
              <motion.span animate={isDragActive ? { y: [0, -8, 0] } : { y: 0 }} transition={{ repeat: isDragActive ? Infinity : 0, duration: 0.8 }}>
                <Upload className="size-10 text-white/80" strokeWidth={1.5} />
              </motion.span>
              <p className="font-display text-3xl font-bold uppercase tracking-wide md:text-4xl">{isDragActive ? tr("dropActive") : tr("dropTitle")}</p>
              <p className="max-w-[56ch] text-base text-white/70">{tr("dropHint")}</p>
              <p className="font-mono text-xs uppercase tracking-x text-white/50">JPG · PNG · MP4 · NIfTI · PDB · GenBank · FASTA</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pick" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid gap-6 border border-white/30 bg-black/60 p-6 md:grid-cols-[240px_1fr] md:p-8">
            <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <FileVideo className="size-14 text-white/70" />}
            </div>
            <div>
              <p className="flex items-center gap-2 font-semibold">
                {kind === "video" ? <FileVideo className="size-5 text-white/70" /> : <FileImage className="size-5 text-white/70" />}
                {files.map((f) => f.name).join(", ")}
              </p>
              <p className="mt-4 font-mono text-sm font-semibold uppercase tracking-wider text-white/70">{tr("dropPick")}</p>
              {tools.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tools.map((id) => (
                    <button key={id} onClick={() => open(id)} className="btn-x border-2 border-white px-5 py-3 font-mono text-xs font-semibold uppercase tracking-x text-white">
                      {t(SHORT[id], locale)}
                    </button>
                  ))}
                </div>
              ) : <p className="mt-3">{tr("dropNone")}</p>}
              <button onClick={() => setFiles([])} className="mt-5 inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase text-white/75 hover:text-white/70">
                <RotateCcw className="size-4" />{tr("dropAgain")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
