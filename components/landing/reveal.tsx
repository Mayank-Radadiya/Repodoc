"use client";

import { useEffect, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { useAnimate } from "motion/react-mini";

// Reveal behavior informed by React Bits Fade Content (David Haz),
// https://reactbits.dev/animations/fade-content. Independently implemented
// with Motion's WAAPI renderer; server-rendered content remains visible.
export function Reveal({ children }: { children: ReactNode }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, { once: true, amount: 0.12 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!inView || reducedMotion) return;
    const animation = animate(
      scope.current,
      {
        opacity: [0.8, 1],
        transform: ["translateY(8px)", "translateY(0px)"],
      },
      { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    );
    return () => animation.stop();
  }, [animate, inView, reducedMotion, scope]);

  return <div ref={scope}>{children}</div>;
}

// Panel transitions informed by Julien Thibeaut's Motion Primitives
// Transition Panel: https://21st.dev/@ibelick/components/transition-panel.
// Independently implemented to retain the existing Base UI tab semantics.
export function PreviewPanel({ children }: { children: ReactNode }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const animation = animate(
      scope.current,
      { opacity: [0.8, 1], transform: ["translateY(4px)", "translateY(0px)"] },
      { duration: 0.18, ease: "easeOut" },
    );
    return () => animation.stop();
  }, [animate, reducedMotion, scope]);

  return <div ref={scope}>{children}</div>;
}
