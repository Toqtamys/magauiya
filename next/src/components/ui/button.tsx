import { cva, type VariantProps } from "class-variance-authority";

// кнопки-«таблетки» с моноширинной подписью
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-mono font-semibold uppercase tracking-wide transition-all duration-200 active:scale-95 focus-visible:outline-3 focus-visible:outline-sun focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-white text-blue hover:bg-sun hover:text-ink hover:-translate-y-0.5",
        dark: "bg-ink text-white hover:bg-sun hover:text-ink hover:-translate-y-0.5",
        outline: "text-white shadow-[inset_0_0_0_2px_#fff] hover:bg-white hover:text-blue",
      },
      size: { md: "px-8 py-4 text-lg", sm: "px-5 py-2.5 text-sm" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
