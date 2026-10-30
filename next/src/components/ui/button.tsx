import { cva, type VariantProps } from "class-variance-authority";

// прямоугольные кнопки-рамки с моноширинной подписью; при наведении заливаются белым
export const buttonVariants = cva(
  "btn-x inline-flex items-center justify-center gap-3 font-mono font-semibold uppercase tracking-x transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4",
  {
    variants: {
      variant: {
        primary: "border-2 border-white text-white",
        dark: "border border-white/40 text-white",
        outline: "border-2 border-white/60 text-white",
      },
      size: { md: "px-8 py-4 text-sm", sm: "px-5 py-2.5 text-xs" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
