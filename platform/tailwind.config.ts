import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './tools/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#06123A', 900: '#040C29', 800: '#06123A', 700: '#0B1E55', 600: '#12296E' },
        deep: '#0B2A8A',
        blue: { DEFAULT: '#1F4FFF', 600: '#1F4FFF', 500: '#3B6BFF', 400: '#6A90FF', 300: '#A3BCFF' },
        cyan: { DEFAULT: '#38C6F4', 300: '#8FE0FA', 200: '#BDEDFC' },
        ice: '#DDF3FF',
        mist: '#F3F7FF',
        line: '#DCE5F7',
      },
      fontFamily: {
        display: ['Unbounded', 'Golos Text', 'system-ui', 'sans-serif'],
        sans: ['"Golos Text"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { page: '1320px' },
      boxShadow: {
        card: '0 1px 0 rgba(6,18,58,.04), 0 12px 40px -18px rgba(11,42,138,.28)',
        lift: '0 30px 80px -30px rgba(11,42,138,.45)',
      },
      keyframes: {
        drift: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: { drift: 'drift 7s ease-in-out infinite', marquee: 'marquee 40s linear infinite' },
    },
  },
  plugins: [],
} satisfies Config;
