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

export function QuickDrop() {
  const tr = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const setDropped = useDropped((s) => s.set);
  const [files, setFiles] = useState<File[]>([]);
  const onDrop = useCallback((accepted: File[]) => setFiles(accepted), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "video/mp4": [], "video/quicktime": [], "video/webm": [] },
  });
  const kind = files.length ? (files[0].type.startsWith("video/") ? "video" : "image") : null;
  const tools = kind === "video" ? FOR_VIDEO : kind === "image" ? FOR_IMAGES : [];
  const preview = useMemo(() => (kind === "image" ? URL.createObjectURL(files[0]) : null), [files, kind]);
  const open = (id: string) => { setDropped(files, id); router.push(`/t/${id}/`); };

  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-24 md:px-6" aria-label={tr("dropTitle")}>
      <AnimatePresence mode="wait">
        {!files.length ? (
          <motion.div key="zone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}>
            <div {...getRootProps({ className: cn(
              "chamfer-lg relative flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed px-6 py-14 text-center transition-colors focus-visible:outline-3 focus-visible:outline-red",
              isDragActive ? "border-red bg-tone2" : "border-ink/25 bg-white hover:border-red hover:bg-tone") })}>
              <input {...getInputProps()} />
              <motion.span animate={isDragActive ? { y: [0, -8, 0] } : { y: 0 }} transition={{ repeat: isDragActive ? Infinity : 0, duration: 0.8 }}>
                <Upload className="size-10 text-red" />
              </motion.span>
              <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase">{isDragActive ? tr("dropActive") : tr("dropTitle")}</p>
              <p className="max-w-[56ch] text-soft">{tr("dropHint")}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-soft">JPG · PNG · WebP · MP4 · MOV</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pick" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="chamfer-lg grid gap-6 bg-tone p-6 md:grid-cols-[220px_1fr] md:p-8">
            <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <FileVideo className="size-14 text-red" />}
            </div>
            <div>
              <p className="flex items-center gap-2 font-semibold">
                {kind === "video" ? <FileVideo className="size-5 text-red" /> : <FileImage className="size-5 text-red" />}
                {files.map((f) => f.name).join(", ")}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-red">{tr("dropPick")}</p>
              {tools.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tools.map((id) => (
                    <button key={id} onClick={() => open(id)} className="chamfer bg-ink px-4 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-red">
                      {t(SHORT[id], locale)}
                    </button>
                  ))}
                </div>
              ) : <p className="mt-3">{tr("dropNone")}</p>}
              <button onClick={() => setFiles([])} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-soft hover:text-red">
                <RotateCcw className="size-4" />{tr("dropAgain")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
