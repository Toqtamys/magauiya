"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const tr = useTranslations();
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-[900px] content-center gap-6 px-4">
      <p className="font-[family-name:var(--font-display)] text-[clamp(80px,14vw,180px)] font-extrabold leading-none text-red">404</p>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">{tr("notFoundH")}</h1>
      <p className="text-lg text-soft">{tr("notFoundP")}</p>
      <Link href="/" className={buttonVariants({ className: "w-fit" })}><ArrowLeft className="size-4" />{tr("home")}</Link>
    </main>
  );
}
