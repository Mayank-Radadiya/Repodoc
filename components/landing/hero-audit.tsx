"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CircleAlert,
  GitBranch,
  RotateCw,
  ScanLine,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { GithubIcon } from "./brand";
import { sampleScore } from "./sample-report";
import styles from "./landing.module.css";

const stages = [
  "Reading the file tree",
  "Inspecting documentation",
  "Checking project hygiene",
  "Reviewing testing and CI",
  "Checking community and security",
  "Audit complete",
];

export function HeroAudit() {
  const [stage, setStage] = useState(stages.length);
  const reduceMotion = useReducedMotion();
  const scanning = stage < stages.length;
  const score = scanning
    ? Math.round((stage / stages.length) * sampleScore)
    : sampleScore;

  useEffect(() => {
    if (!scanning) return;
    const timer = window.setInterval(
      () => setStage((current) => Math.min(current + 1, stages.length)),
      300,
    );
    return () => window.clearInterval(timer);
  }, [scanning]);

  return (
    <div className={styles.heroAudit}>
      <div className={styles.heroAuditBar}>
        <span>
          <span className={styles.heroStatusDot} /> SAMPLE AUDIT
        </span>
        <span>rubric v1.0</span>
      </div>
      <div className={styles.heroAuditRepo}>
        <GithubIcon size={18} />
        <span>
          sample <span>/</span> <strong>atlas-cli</strong>
        </span>
        <GitBranch size={13} />
      </div>
      <div className={styles.heroAuditScore}>
        <div className={styles.heroGauge}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#ffffff12"
              strokeWidth="4"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#b6e8d8"
              strokeWidth="4"
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              strokeDasharray="326.73"
              initial={false}
              animate={{ strokeDashoffset: 326.73 * (1 - score / 100) }}
              transition={{ duration: reduceMotion ? 0 : 0.5 }}
            />
          </svg>
          <div>
            <strong>{score}</strong>
            <span>/ 100</span>
          </div>
        </div>
        <div>
          <span className={styles.heroGaugeLabel}>REPOSITORY HEALTH</span>
          <h2>{scanning ? "Looking closer…" : "A solid foundation."}</h2>
          <p>
            {scanning
              ? "Inspecting the sample repository."
              : "Two gaps. A clear next step."}
          </p>
        </div>
      </div>
      <div className={styles.heroAuditFindings} aria-hidden={scanning}>
        <div>
          <CircleAlert size={14} />
          <span>Missing .gitignore</span>
          <code>−5</code>
        </div>
        <div>
          <CircleAlert size={14} />
          <span>No CI workflow</span>
          <code>−15</code>
        </div>
      </div>
      <div className={styles.heroAuditStatus} role="status" aria-live="polite">
        <span>
          {scanning ? <ScanLine size={14} /> : <Check size={14} />}
          {scanning ? stages[stage] : "13 checks · 5 categories inspected"}
        </span>
      </div>
      <button
        type="button"
        className={styles.replayScan}
        disabled={scanning}
        onClick={() => setStage(reduceMotion ? stages.length : 0)}
      >
        <RotateCw
          size={13}
          className={scanning ? styles.scanSpinner : undefined}
        />
        {scanning ? "Scanning sample…" : "Replay sample scan"}
        <span>Local demo</span>
      </button>
    </div>
  );
}
