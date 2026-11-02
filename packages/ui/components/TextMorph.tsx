"use client";

// Adapted from Motion Primitives TextMorph, MIT, Copyright (c) 2024 ibelick.
// Source: ibelick/motion-primitives@120f64f6ca60348e251f929e9c81f11ccbe45eda
// Changes: existing framer-motion runtime, reduced/unknown preference fallback,
// stable SSR content, span-only API and accessible static text. See NOTICE below.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";

export function TextMorph({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const letters = useMemo(() => {
    const counts: Record<string, number> = {};
    return Array.from(children).map((char) => {
      const key = char.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
      return {
        id: `${id}-${key}-${counts[key]}`,
        label: char === " " ? "\u00a0" : char,
      };
    });
  }, [children, id]);
  if (!mounted || reduce !== false)
    return <span className={className}>{children}</span>;
  return (
    <span className={className}>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <span aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">
          {letters.map((letter) => (
            <motion.span
              key={letter.id}
              layoutId={letter.id}
              style={{ display: "inline-block" }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {letter.label}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </span>
  );
}
