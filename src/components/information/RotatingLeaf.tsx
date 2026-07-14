"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Leaf } from "lucide-react";

/*
  Signature motif: a leaf that spins slowly and continuously, an elegant,
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
      // Sideways spin: rotate around the vertical axis (a gentle coin-flip),
      // with perspective so it reads as 3D. transformPerspective keeps it calm.
      style={{ transformPerspective: 700 }}
      animate={reduce ? undefined : { rotateY: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <Leaf size={size} strokeWidth={2} className={className} />
    </motion.span>
  );
}
