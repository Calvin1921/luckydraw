"use client";

import { useState, useEffect } from "react";

/**
 * Returns true if the user prefers reduced motion.
 * Canvas, GSAP, and Framer Motion animations should check this
 * and provide static fallbacks when true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
