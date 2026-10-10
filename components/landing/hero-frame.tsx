"use client";

import type { ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import styles from "./landing.module.css";

export function HeroFrame({
  children,
  backdrop,
}: {
  children: ReactNode;
  backdrop: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 70]);
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <motion.div
        className={styles.heroBackdrop}
        style={reduceMotion ? undefined : { y }}
      >
        {backdrop}
      </motion.div>
      <motion.div
        className={styles.heroForeground}
        initial={reduceMotion ? false : { opacity: 0.8, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}
