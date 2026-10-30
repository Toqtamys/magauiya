import { notFound } from "next/navigation";
import { ToolPage } from "@/components/ToolPage";
import { ORDER, SHORT, toolById } from "@/lib/catalog";

export const dynamicParams = false;
export function generateStaticParams() {
  return ORDER.map((id) => ({ id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = SHORT[id];
  return { title: `${typeof s === "string" ? s : s?.ru} — BOPASI`, description: toolById(id)?.tagline.ru };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!toolById(id)) notFound();
  return <ToolPage id={id} />;
}
