"use client";
// Старые ссылки вида /bopasi/#scd ведут на страницу инструмента /bopasi/t/scd/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toolById } from "@/lib/catalog";

export function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && toolById(id)) router.replace(`/t/${id}/`);
  }, [router]);
  return null;
}
