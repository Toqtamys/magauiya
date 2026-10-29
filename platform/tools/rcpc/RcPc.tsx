'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { L, UI, tr, type Lang } from '@/lib/i18n';
import { UploadZone } from '@/components/UploadZone';
import { estimateAngle, luma, process, toImageData, type Dir, type Params } from './engine';

const MAXSIDE = 1400;

export function RcPc({ lang }: { lang: Lang }) {
  const [srcImg, setSrcImg] = useState<HTMLCanvasElement | null>(null);
  const [dir, setDir] = useState<Dir>('rc2pc');
  const [angle, setAngle] = useState(135);
  const [strength, setStrength] = useState(1);
  const [halo, setHalo] = useState(0.6);
  const [haloRadius, setHaloRadius] = useState(6);
  const [leak, setLeak] = useState(0.96);
  const [invert, setInvert] = useState(false);
  const [split, setSplit] = useState(50);
  const [busy, setBusy] = useState(false);
  const outRef = useRef<HTMLCanvasElement>(null);
  const [outUrl, setOutUrl] = useState<string>('');

  const load = useCallback((files: File[]) => {
    const file = files[0]; if (!file) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAXSIDE / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d')!.drawImage(img, 0, 0, w, h);
      // автоугол тени
      const f = luma(cv.getContext('2d')!.getImageData(0, 0, w, h));
      setAngle(Math.round(estimateAngle(f)));
      setSrcImg(cv);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const run = useCallback(() => {
    if (!srcImg) return;
    setBusy(true);
    requestAnimationFrame(() => {
      const ctx = srcImg.getContext('2d')!;
      const f = luma(ctx.getImageData(0, 0, srcImg.width, srcImg.height));
      const p: Params = { dir, angleDeg: angle, strength, halo, haloRadius, leak, invert };
      const res = process(f, p);
      const out = outRef.current!; out.width = res.w; out.height = res.h;
      out.getContext('2d')!.putImageData(toImageData(res), 0, 0);
      out.toBlob((b) => { if (b) setOutUrl(URL.createObjectURL(b)); }, 'image/png');
      setBusy(false);
    });
  }, [srcImg, dir, angle, strength, halo, haloRadius, leak, invert]);

  useEffect(() => { run(); }, [run]);

  const Slider = ({ label, value, set, min, max, step, unit }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; unit?: string }) => (
    <label className="block">
      <div className="flex justify-between text-xs font-medium text-navy/70"><span>{label}</span><span className="font-mono text-navy/50">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(parseFloat(e.target.value))} className="mt-1.5 w-full accent-blue" />
    </label>
  );

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6">
      {!srcImg ? (
        <UploadZone lang={lang} accept="image/*" multiple={false} onFiles={load}
          hint={tr(L('PNG/JPG/BMP/WebP · снимок ооцита, эмбриона или клеток', 'PNG/JPG/BMP/WebP · ооцит, эмбрион не жасушалар суреті', 'PNG/JPG/BMP/WebP · an oocyte, embryo or cell image'), lang)} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-line bg-navy/5">
              <canvas ref={outRef} className="block w-full" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
              <img src={srcImg.toDataURL()} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" style={{ clipPath: `inset(0 0 0 ${split}%)` }} />
              <div className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%` }}><div className="h-full w-0.5 bg-white shadow" /></div>
              <span className="absolute left-2 top-2 rounded bg-navy/70 px-2 py-0.5 text-[10px] font-semibold text-white">{dir === 'rc2pc' ? 'RC' : 'PC'}</span>
              <span className="absolute right-2 top-2 rounded bg-blue/90 px-2 py-0.5 text-[10px] font-semibold text-white">{dir === 'rc2pc' ? 'Phase contrast' : 'RC'}</span>
            </div>
            <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(+e.target.value)} className="mt-3 w-full accent-blue" aria-label="before/after" />
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={outUrl} download="bopasi-converted.png" className="rounded-full bg-blue px-4 py-2 text-xs font-semibold text-white hover:bg-deep">PNG ↓</a>
              <button onClick={() => { setSrcImg(null); setOutUrl(''); }} className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-navy/70 hover:bg-mist">{tr(UI.back, lang)}</button>
              {busy && <span className="self-center text-xs text-navy/50">…</span>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 rounded-full bg-mist p-1 text-xs font-semibold">
              <button onClick={() => setDir('rc2pc')} className={`rounded-full py-2 transition ${dir === 'rc2pc' ? 'bg-white text-blue shadow' : 'text-navy/60'}`}>RC → PC</button>
              <button onClick={() => setDir('pc2rc')} className={`rounded-full py-2 transition ${dir === 'pc2rc' ? 'bg-white text-blue shadow' : 'text-navy/60'}`}>PC → RC</button>
            </div>
            <Slider label={tr(L('Угол тени', 'Көлеңке бұрышы', 'Shadow angle'), lang)} value={angle} set={setAngle} min={0} max={359} step={1} unit="°" />
            <Slider label={tr(L('Сила', 'Күш', 'Strength'), lang)} value={strength} set={setStrength} min={0} max={2} step={0.05} />
            {dir === 'rc2pc' && <Slider label={tr(L('Длина интегрирования', 'Интегралдау ұзындығы', 'Integration length'), lang)} value={leak} set={setLeak} min={0.8} max={0.995} step={0.005} />}
            <Slider label={tr(L('Ореол', 'Ореол', 'Halo'), lang)} value={halo} set={setHalo} min={0} max={1.5} step={0.05} />
            <Slider label={tr(L('Размер ореола', 'Ореол өлшемі', 'Halo size'), lang)} value={haloRadius} set={setHaloRadius} min={1} max={20} step={1} unit="px" />
            <button onClick={() => setInvert((v) => !v)} className={`w-full rounded-full border px-4 py-2 text-xs font-semibold transition ${invert ? 'border-blue bg-blue/10 text-blue' : 'border-line text-navy/70 hover:bg-mist'}`}>
              {tr(L('Инвертировать рельеф', 'Рельефті инверттеу', 'Invert relief'), lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
