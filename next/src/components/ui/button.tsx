import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "chamfer relative inline-flex items-center justify-center gap-2 overflow-hidden px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-3 focus-visible:outline-red focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary: "shine bg-red text-white hover:bg-red-dark",
        outline: "bg-white text-ink shadow-[inset_0_0_0_2px_var(--color-ink)] hover:bg-ink hover:text-white",
        dark: "bg-ink text-white hover:bg-red",
      },
      size: { md: "", sm: "px-4 py-2.5 text-xs" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
