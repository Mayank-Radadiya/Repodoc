import { FileCode2, Check, Plus } from "lucide-react";
import { sampleScore, proposedFiles } from "./sample-report";
import styles from "./landing.module.css";

export function HealthBadge() {
  return (
    <span
      className={styles.healthBadge}
      aria-label={`Repodoc sample health score: ${sampleScore} out of 100`}
    >
      <span>repo health</span>
      <strong>{sampleScore}/100</strong>
    </span>
  );
}

export function FileDiff({
  file,
  compact = false,
}: {
  file: (typeof proposedFiles)[number];
  compact?: boolean;
}) {
  const lines = file.lines;
  return (
    <div className={styles.fileDiff}>
      <div className={styles.diffHeader}>
        <span>
          <FileCode2 size={15} />
          <code>{file.path}</code>
        </span>
        <span className={styles.added}>
          <Plus size={12} /> {file.lines.length}
        </span>
      </div>
      <div
        className={styles.diffScroll}
        tabIndex={0}
        role="region"
        aria-label={`Proposed additions to ${file.path}`}
      >
        <pre>
          {lines.map((line, i) => (
            <span className={styles.diffLine} key={i}>
              <span className={styles.lineNumber} aria-hidden="true">
                {i + 1}
              </span>
              <span className={styles.linePlus} aria-hidden="true">
                +
              </span>
              <code>{line || " "}</code>
              {"\n"}
            </span>
          ))}
        </pre>
      </div>
      {compact && (
        <div className={styles.diffFooter}>
          <span>
            <Check size={13} /> New file · existing files preserved
          </span>
          <span>Illustrative diff</span>
        </div>
      )}
    </div>
  );
}
