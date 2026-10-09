"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ShieldCheck } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { cn } from "@/lib/utils";

const SURFACE =
  "bg-white/95 shadow-[0_1px_0_rgba(0,0,0,0.04),0_4px_20px_rgba(34,42,53,0.10)] border border-slate-200/80";

const RESIZE_TRANSITION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
} as const;

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const next = latest > 100;
    setVisible((prev) => (prev === next ? prev : next));
  });

  return (
    <motion.nav
      ref={ref}
      aria-label="Main"
      style={{ willChange: "transform", transform: "translateZ(0)" }}
      className={cn("sticky inset-x-0 top-0 z-50 w-full", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </motion.nav>
  );
};

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

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-1 text-sm font-medium text-slate-600 transition duration-200 lg:flex",
        className,
      )}
    >
      {items.map((item, idx) => (
        <a
          key={`nav-link-${idx}`}
          href={item.link}
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="relative rounded-full px-4 py-2 text-slate-700 transition-colors hover:text-[#005FD6]"
        >
          {hovered === idx && (
            <motion.div
              layoutId="nav-hovered"
              className="absolute inset-0 h-full w-full rounded-full bg-slate-100"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-20">{item.name}</span>
        </a>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        width: visible ? "94%" : "100%",
        y: visible ? 12 : 0,
      }}
      transition={RESIZE_TRANSITION}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between rounded-2xl bg-transparent px-3 py-2 transition-colors duration-300 lg:hidden",
        visible && SURFACE,
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="mobile-nav-menu"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
          className={cn(
            "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-overlay)]",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      aria-controls="mobile-nav-menu"
      className="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:text-slate-900 active:bg-slate-100"
    >
      {isOpen ? <X size={22} /> : <Menu size={22} />}
    </button>
  );
};

export const NavbarLogo = () => {
  return (
    <Link
      href="/"
      aria-label="RepoLens home"
      className="relative z-20 mr-4 flex shrink-0 transform-gpu items-center gap-2.5 rounded-lg px-2 py-1 text-sm font-normal"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#005FD6] to-[#209BFF] text-white shadow-sm">
        <ShieldCheck size={18} strokeWidth={2.4} />
      </div>
      <span className="wordmark font-display text-lg font-bold tracking-tight text-slate-900 transition-colors md:text-xl">
        RepoLens
      </span>
    </Link>
  );
};
