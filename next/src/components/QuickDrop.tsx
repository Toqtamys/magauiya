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
    <section className="mx-auto max-w-[1400px] px-4 pt-28 md:px-8" aria-label={tr("dropTitle")}>
      <AnimatePresence mode="wait">
        {!files.length ? (
          <motion.div key="zone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}>
            <div {...getRootProps({ className: cn(
              "relative flex cursor-pointer flex-col items-center gap-3 rounded-[40px] border-[3px] border-dashed px-6 py-16 text-center transition-all focus-visible:outline-3 focus-visible:outline-sun",
              isDragActive ? "scale-[1.01] border-sun bg-blue-deep" : "glass border-sun/40 hover:border-neon hover:shadow-[0_0_40px_rgba(255,43,214,.35)]") })}>
              <input {...getInputProps()} />
              <motion.span animate={isDragActive ? { y: [0, -8, 0] } : { y: 0 }} transition={{ repeat: isDragActive ? Infinity : 0, duration: 0.8 }}>
                <Upload className="size-12 text-sun" />
              </motion.span>
              <p className="font-display text-4xl font-bold uppercase md:text-5xl">{isDragActive ? tr("dropActive") : tr("dropTitle")}</p>
              <p className="max-w-[56ch] text-lg text-white/85">{tr("dropHint")}</p>
              <p className="font-mono text-sm uppercase tracking-wider text-sun">JPG · PNG · MP4 · NIfTI · PDB · GenBank · FASTA</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pick" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid gap-6 glass rounded-[40px] border border-sun/30 p-6 md:grid-cols-[240px_1fr] md:p-8">
            <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-[24px] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <FileVideo className="size-14 text-blue" />}
            </div>
            <div>
              <p className="flex items-center gap-2 font-semibold">
                {kind === "video" ? <FileVideo className="size-5 text-sun" /> : <FileImage className="size-5 text-sun" />}
                {files.map((f) => f.name).join(", ")}
              </p>
              <p className="mt-4 font-mono text-sm font-semibold uppercase tracking-wider text-sun">{tr("dropPick")}</p>
              {tools.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tools.map((id) => (
                    <button key={id} onClick={() => open(id)} className="rounded-full bg-white px-5 py-3 font-mono text-sm font-semibold uppercase text-ink transition-all hover:-translate-y-0.5 hover:bg-sun hover:text-ink">
                      {t(SHORT[id], locale)}
                    </button>
                  ))}
                </div>
              ) : <p className="mt-3">{tr("dropNone")}</p>}
              <button onClick={() => setFiles([])} className="mt-5 inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase text-white/75 hover:text-sun">
                <RotateCcw className="size-4" />{tr("dropAgain")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
