"use client";

import { useEffect, useState } from "react";
import styles from "./report.module.css";

const SECTIONS = [
  { id: "report-overview", label: "Overview" },
  { id: "report-findings", label: "Findings" },
  { id: "report-improvements", label: "Improvements" },
  { id: "report-badge", label: "Badge" },
] as const;

export function ReportSectionNav() {
  const [activeId, setActiveId] = useState<string>("report-overview");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = SECTIONS.flatMap(({ id }) => {
        const element = document.getElementById(id);
        return element ? [{ id, bounds: element.getBoundingClientRect() }] : [];
      });
      // Use the same clearance as native anchors, including when text is zoomed.
      const scrollPadding = parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      );
      const readingLine =
        (Number.isFinite(scrollPadding) ? scrollPadding : 96) + 8;
      const hashId = window.location.hash.slice(1);
      const atBottom =
        Math.ceil(window.scrollY + window.innerHeight) >=
        document.documentElement.scrollHeight;
      const anchored = sections.find(
        ({ id, bounds }) =>
          id === hashId &&
          bounds.bottom > readingLine &&
          (bounds.top <= readingLine ||
            (atBottom && bounds.top < window.innerHeight)),
      );
      // On desktop the tools sit beside findings. Prefer findings at equal
      // scroll positions, unless the user explicitly followed a tools anchor.
      const reading = sections.find(
        ({ bounds }) =>
          bounds.top <= readingLine && bounds.bottom > readingLine,
      );
      const preceding = sections
        .filter(({ bounds }) => bounds.top <= readingLine)
        .sort((a, b) => b.bounds.top - a.bounds.top)[0];
      setActiveId((anchored ?? reading ?? preceding)?.id ?? "report-overview");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
    };
  }, []);

  return (
    <div className={styles.sectionBar}>
      <nav aria-label="Report sections" className={styles.sectionNav}>
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={activeId === id ? "location" : undefined}
            onClick={() => setActiveId(id)}
          >
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
