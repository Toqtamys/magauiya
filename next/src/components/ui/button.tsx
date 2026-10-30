import { cva, type VariantProps } from "class-variance-authority";

// кнопки-«таблетки» с моноширинной подписью
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-mono font-semibold uppercase tracking-wide transition-all duration-200 active:scale-95 focus-visible:outline-3 focus-visible:outline-sun focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-sun text-ink shadow-[0_0_24px_rgba(46,242,255,.55)] hover:bg-neon hover:text-white hover:shadow-[0_0_28px_rgba(255,43,214,.7)] hover:-translate-y-0.5",
        dark: "bg-ink text-white shadow-[inset_0_0_0_1px_#2ef2ff] hover:bg-sun hover:text-ink hover:-translate-y-0.5",
        outline: "text-white shadow-[inset_0_0_0_2px_#2ef2ff] hover:bg-sun hover:text-ink",
      },
      size: { md: "px-8 py-4 text-lg", sm: "px-5 py-2.5 text-sm" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
