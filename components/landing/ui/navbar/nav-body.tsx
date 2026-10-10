"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SURFACE, RESIZE_TRANSITION } from "./constants";

export interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        width: visible ? "64%" : "100%",
        y: visible ? 16 : 0,
      }}
      transition={RESIZE_TRANSITION}
      style={{ minWidth: "680px", contain: "layout" }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full bg-transparent px-5 py-2.5 transition-colors duration-300 lg:flex",
        visible && SURFACE,
        className,
      )}
    >
      {children}
    </motion.div>
  );
};
