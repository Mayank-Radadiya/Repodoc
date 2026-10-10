"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  FileCode2,
  Folder,
  GitPullRequest,
  ListChecks,
  ScanLine,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FileDiff } from "./product-visuals";
import { proposedFiles } from "./sample-report";
import styles from "./landing.module.css";

const steps = [
  {
    label: "Look at the whole repository.",
    description: "Files, documentation, and project context.",
    icon: ScanLine,
    view: "overview",
  },
  {
    label: "Understand what is missing.",
    description: "Evidence you can inspect, not a black box.",
    icon: ListChecks,
    view: "findings",
  },
  {
    label: "Make a focused improvement.",
    description: "Missing essentials, bundled for review.",
    icon: GitPullRequest,
    view: "pr",
  },
];
const tree = [
  { name: "src/", kind: "folder", detail: "Project source" },
  { name: "package.json", kind: "file", detail: "Node.js detected" },
  { name: "README.md", kind: "file", detail: "Installation + usage" },
  { name: ".gitignore", kind: "missing", detail: "Missing · 5 points" },
  {
    name: ".github/workflows/ci.yml",
    kind: "missing",
    detail: "Missing · 15 points",
  },
];

export function WorkflowExplorer() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  return (
    <div className={styles.journey}>
      <div
        className={styles.journeySteps}
        aria-label="Explore the audit workflow"
      >
        {steps.map((step, index) => (
          <button
            type="button"
            key={step.label}
            id={`journey-step-${index}`}
            aria-pressed={index === active}
            aria-controls="journey-detail"
            onClick={() => setActive(index)}
            className={styles.journeyStep}
          >
            <span className={styles.journeyNumber}>0{index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <span>{step.description}</span>
            </div>
            <step.icon size={20} />
          </button>
        ))}
        <span className={styles.journeyHint}>Click a step to look closer.</span>
      </div>
      <div
        id="journey-detail"
        role="region"
        aria-labelledby={`journey-step-${active}`}
        className={styles.journeyDetail}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <div className={styles.journeyDetailHeader}>
              <span>sample / atlas-cli</span>
              <span>
                0{active + 1} —{" "}
                {active === 0
                  ? "INSPECT"
                  : active === 1
                    ? "UNDERSTAND"
                    : "IMPROVE"}
              </span>
            </div>
            {active === 0 ? (
              <div className={styles.repositoryTree}>
                {tree.map((file) => (
                  <div key={file.name} data-missing={file.kind === "missing"}>
                    {file.kind === "folder" ? (
                      <Folder size={16} />
                    ) : file.kind === "missing" ? (
                      <CircleAlert size={16} />
                    ) : (
                      <FileCode2 size={16} />
                    )}
                    <code>{file.name}</code>
                    <span>{file.detail}</span>
                  </div>
                ))}
              </div>
            ) : active === 1 ? (
              <div className={styles.journeyEvidence}>
                <span className={styles.issueLabel}>
                  <CircleAlert size={16} /> MISSING ESSENTIAL
                </span>
                <h3>Your project has no ignore file.</h3>
                <p>
                  The repository root contains package.json, but no .gitignore.
                  Dependencies, environment files, and generated output need a
                  place in the ignore rules.
                </p>
                <div>
                  <span>Inspected</span>
                  <code>repository root → .gitignore</code>
                </div>
                <div>
                  <span>Next step</span>
                  <strong>
                    <Check size={14} /> Add a Node.js .gitignore
                  </strong>
                </div>
              </div>
            ) : (
              <div className={styles.journeyDiff}>
                <div className={styles.journeyPrLabel}>
                  <GitPullRequest size={16} />
                  <span>Add missing repository essentials</span>
                  <span>1 commit</span>
                </div>
                <FileDiff file={proposedFiles[0]} />
              </div>
            )}
            <a
              href="#product-preview"
              data-preview-view={steps[active].view}
              className={styles.journeyLink}
            >
              Inspect this in the sample audit <ArrowUpRight size={14} />
            </a>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
