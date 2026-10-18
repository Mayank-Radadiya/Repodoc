"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ChevronDown,
  Plus,
  Undo2,
} from "lucide-react";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { CheckResult } from "@/lib/types";
import { formatPoints, getPotentialPoints } from "./report-preview";
import { EvidenceExcerpt } from "./evidence-excerpt";
import styles from "./report.module.css";

export interface CheckRowProps {
  check: CheckResult;
  owner: string;
  repo: string;
  defaultBranch: string;
  isPreviewed: boolean;
  onTogglePreview: (checkId: string) => void;
}

export function CheckRow({
  check,
  owner,
  repo,
  defaultBranch,
  isPreviewed,
  onTogglePreview,
}: CheckRowProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const potential = getPotentialPoints(check);
  const showPreviewToggle = isPreviewed || (!check.passed && potential > 0);
  const StatusIcon = check.passed ? CheckCircle2 : CircleAlert;
  const statusLabel = isPreviewed
    ? "Previewed"
    : check.passed
      ? "Passed"
      : "Failed";

  return (
    <li className={styles.checkRow}>
      <div className={styles.checkRowLayout}>
        <StatusIcon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            isPreviewed
              ? "text-info-foreground"
              : check.passed
                ? "text-success-foreground"
                : "text-warning-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className={styles.checkHeading}>
            <p className={styles.checkTitle}>{check.name}</p>
            <span
              className={cn(
                styles.statusBadge,
                isPreviewed
                  ? "bg-info/8 text-info-foreground"
                  : check.passed
                    ? "bg-success/8 text-success-foreground"
                    : "bg-warning/10 text-warning-foreground",
              )}
            >
              {statusLabel}
            </span>
            <span className={styles.checkPoints}>
              {formatPoints(check.pointsAwarded)}/{check.maxPoints} pts
            </span>
          </div>
          {!evidenceOpen && (
            <p className={styles.evidenceExcerpt}>
              {check.evidence.details.trim() || "No evidence details available"}
            </p>
          )}
          <Collapsible open={evidenceOpen} onOpenChange={setEvidenceOpen}>
            <div className={styles.checkActions}>
              <CollapsibleTrigger
                aria-label={`Evidence and remediation for ${check.name}`}
                className="group flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Evidence &amp; remediation
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none"
                />
              </CollapsibleTrigger>
              {showPreviewToggle && (
                <button
                  type="button"
                  aria-pressed={isPreviewed}
                  aria-label={
                    isPreviewed
                      ? `Remove preview for ${check.name}`
                      : `Preview fix for ${check.name}: +${formatPoints(potential)} pts`
                  }
                  onClick={() => onTogglePreview(check.id)}
                  className={styles.previewButton}
                >
                  {isPreviewed ? (
                    <Undo2 aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Plus aria-hidden="true" className="size-3.5" />
                  )}
                  {isPreviewed
                    ? "Undo preview"
                    : `Preview +${formatPoints(potential)} pts`}
                </button>
              )}
            </div>
            <CollapsiblePanel className="motion-reduce:transition-none">
              <EvidenceExcerpt
                details={check.evidence.details}
                found={check.evidence.found}
                filesChecked={check.evidence.filesChecked}
                remediation={check.remediation}
                owner={owner}
                repo={repo}
                defaultBranch={defaultBranch}
              />
            </CollapsiblePanel>
          </Collapsible>
        </div>
      </div>
    </li>
  );
}
