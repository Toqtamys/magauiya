'use client';
import dynamic from 'next/dynamic';
import type { Tool } from '@/data/types';
import type { Lang } from '@/lib/i18n';
import { Embed } from './Embed';
import { FileCheck } from './FileCheck';
import { Calculator } from '@/tools/calculators/Calculators';

const RcPc = dynamic(() => import('@/tools/rcpc/RcPc').then((m) => m.RcPc), { ssr: false, loading: () => <Loading /> });
const Constructor = dynamic(() => import('@/tools/constructor/Constructor').then((m) => m.Constructor), { ssr: false, loading: () => <Loading /> });

function Loading() { return <div className="grid h-40 place-items-center rounded-3xl border border-line bg-mist/40 text-sm text-navy/50">…</div>; }

export function Interactive({ tool, lang }: { tool: Tool; lang: Lang }) {
  switch (tool.interactive) {
    case 'bopasi': return <Embed lang={lang} src="/apps/magauiya.html" title="BOPASI · Magauiya CASA" />;
    case 'bluetol': return <Embed lang={lang} src="/apps/bluetol.html" title="Блютол · DFI" />;
    case 'rcpc': return <RcPc lang={lang} />;
    case 'constructor': return <Constructor lang={lang} />;
    case 'duedate': return <Calculator kind="duedate" lang={lang} />;
    case 'hcg': return <Calculator kind="hcg" lang={lang} />;
    case 'tmsc': return <Calculator kind="tmsc" lang={lang} />;
    case 'fertile': return <Calculator kind="fertile" lang={lang} />;
    case 'gardner': return <Calculator kind="gardner" lang={lang} />;
    default:
      return tool.check ? <FileCheck lang={lang} check={tool.check} runCmd={tool.runCmd} /> : null;
  }
}
