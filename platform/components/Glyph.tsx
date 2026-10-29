/** Тонкие абстрактные глифы разделов: сперматозоид, эмбрион, ткань, календарь, клетка, молекула. */
export type GlyphName = 'sperm' | 'embryo' | 'tissue' | 'calendar' | 'cell' | 'molecule';

export function Glyph({ name, className = 'h-7 w-7', stroke = 1.6 }: { name: GlyphName; className?: string; stroke?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'sperm':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="13" cy="15" r="6" />
          <circle cx="13" cy="15" r="2.2" opacity=".6" />
          <path d="M18 18 C28 24 20 30 30 34 C38 37 33 42 40 42" />
        </svg>
      );
    case 'embryo':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="24" cy="24" r="16" />
          <circle cx="20" cy="21" r="5.3" /><circle cx="29" cy="20" r="4.6" />
          <circle cx="22" cy="30" r="4.3" /><circle cx="30" cy="29" r="3.8" />
        </svg>
      );
    case 'tissue':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <path d="M6 16 Q14 10 22 16 T40 16" /><path d="M6 26 Q14 20 22 26 T40 26" /><path d="M6 36 Q14 30 22 36 T40 36" />
          <circle cx="15" cy="21" r="1.6" /><circle cx="31" cy="21" r="1.6" /><circle cx="23" cy="31" r="1.6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <rect x="8" y="11" width="32" height="29" rx="4" /><path d="M8 19h32M16 7v6M32 7v6" />
          <circle cx="24" cy="29" r="4.5" /><path d="M24 29l3-2" />
        </svg>
      );
    case 'cell':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <path d="M24 7c10 0 17 7 17 17s-9 17-19 17S5 32 6 23 14 7 24 7Z" />
          <circle cx="26" cy="23" r="6" /><circle cx="26" cy="23" r="2" opacity=".6" />
          <circle cx="15" cy="31" r="1.5" /><circle cx="34" cy="32" r="1.5" />
        </svg>
      );
    case 'molecule':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="24" cy="12" r="4" /><circle cx="12" cy="30" r="4" /><circle cx="36" cy="30" r="4" /><circle cx="24" cy="38" r="3" />
          <path d="M24 16 15 27M24 16l9 11M14 33l8 4M34 33l-8 4" />
        </svg>
      );
  }
}
