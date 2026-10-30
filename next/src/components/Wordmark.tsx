"use client";
// Игривый логотип: буквы BOPASI с наклоном, при наведении подпрыгивают
import { motion } from "framer-motion";

const LETTERS = [["B", -8], ["O", 4], ["P", -5], ["A", 6], ["S", -4], ["I", 8]] as const;

export function Wordmark({ size = "text-3xl" }: { size?: string }) {
  return (
    <span className={`font-display ${size} inline-flex items-end font-bold uppercase leading-none`} aria-label="BOPASI">
      {LETTERS.map(([ch, r], i) => (
        <motion.span key={i} className="inline-block" style={{ rotate: r }} aria-hidden="true"
          whileHover={{ y: -6, rotate: -r }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
          {ch}
        </motion.span>
      ))}
      <motion.span className="ml-0.5 inline-block text-sun" aria-hidden="true" animate={{ rotate: [12, 22, 12] }} transition={{ repeat: Infinity, duration: 2.4 }}>!</motion.span>
    </span>
  );
}
