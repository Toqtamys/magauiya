// Логотип: BOPASI широкой разрядкой, как маркировка на борту
export function Wordmark({ size = "text-xl" }: { size?: string }) {
  return <span className={`font-display ${size} font-bold uppercase leading-none tracking-[0.32em]`} aria-label="BOPASI">BOPASI</span>;
}
