"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Leaf } from "lucide-react";

/*
  Signature motif: a leaf that spins slowly and continuously — an elegant,
  calm accent (never fast/distracting). Recurs across all three pages. Honors
  reduced-motion by staying still.
*/
export default function RotatingLeaf({
  size = 30,
  className = "text-teal",
  duration = 18,
}: {
  size?: number;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-flex"
      aria-hidden="true"
      animate={reduce ? undefined : { rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <Leaf size={size} strokeWidth={2} className={className} />
    </motion.span>
  );
}
