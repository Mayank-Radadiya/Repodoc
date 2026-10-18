"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  AlertCircle,
  ExternalLink,
  GitBranch,
  GitFork,
  Loader2,
  RotateCcw,
  ScanLine,
  Star,
} from "lucide-react";
import type { DashboardRepoItem } from "@/lib/dashboard";
import { formatAuditDate, getHealthBand, hasHealthScore, type RepositoryAuditState } from "./dashboard-model";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./dashboard.module.css";

export interface DashboardRepoCardProps {
  repo: DashboardRepoItem;
  onAudit: (repo: DashboardRepoItem) => void;
  auditState?: RepositoryAuditState;
}

function languageClass(language: string | null) {
  if (language === "TypeScript") return styles.languageBlue;
  if (language === "JavaScript") return styles.languageYellow;
  if (language === "Python") return styles.languageGreen;
  if (language === "Go") return styles.languageCyan;
  if (language === "Rust" || language === "HTML") return styles.languageOrange;
  return styles.languageNeutral;
}

export function DashboardRepoCard({
  repo,
  onAudit,
  auditState,
}: DashboardRepoCardProps) {
  const isAuditing = auditState?.pending ?? false;
  const error = auditState?.error;
  const errorId = useId();
  const reducedMotion = useReducedMotion();

  const reportUrl = `/report/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
  const score = hasHealthScore(repo) ? repo.healthScore : null;
  const health = score !== null ? getHealthBand(score) : null;
  const date = repo.hasReport ? formatAuditDate(repo.lastAuditedAt) : null;

  return (
    <article
      className={styles.repoRow}
      aria-label={`Repository ${repo.fullName}`}
    >
      <div className={styles.repoDetails}>
        <div className={styles.repoTitle}>
          <a
            href={repo.githubUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.repoLink}
          >
            {repo.name}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
          <span className={styles.visibility}>
            {repo.isPrivate ? "Private" : "Public"}
          </span>
        </div>
        <p className={styles.description}>
          {repo.description || "No description provided."}
        </p>
        <div className={styles.metadata}>
          {repo.language && (
            <span>
              <i
                className={cn(styles.languageDot, languageClass(repo.language))}
                aria-hidden="true"
              />
              {repo.language}
            </span>
          )}
          <span aria-label={`${repo.starsCount} stars`}>
            <Star size={13} aria-hidden="true" />
            {repo.starsCount}
          </span>
          <span aria-label={`${repo.forksCount} forks`}>
            <GitFork size={13} aria-hidden="true" />
            {repo.forksCount}
          </span>
          <span
            className={styles.branch}
            title={`Branch: ${repo.defaultBranch}`}
          >
            <GitBranch size={13} aria-hidden="true" />
            {repo.defaultBranch}
          </span>
        </div>
      </div>

      <div className={cn(styles.repoHealth, health && styles[health.key])}>
        <span className={styles.mobileLabel}>Health</span>
        {score !== null && health ? (
          <>
            <motion.span className={styles.score} key={`${score}-${repo.lastAuditedAt}`} initial={auditState?.completed && !reducedMotion ? { opacity: 0, y: 3 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
              {score}
              <span>/100</span>
            </motion.span>
            <div
              role="meter"
              aria-label={`Health score for ${repo.name}`}
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${score} out of 100, ${health.label}`}
              className={styles.healthTrack}
            >
              <span
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
            <span className={styles.healthLabel}>{health.label}</span>
          </>
        ) : (
          <>
            <span className={styles.unscored}>
              {repo.hasReport ? "Score unavailable" : "Not audited yet"}
            </span>
            <span className={styles.healthHint}>
              {repo.hasReport ? "Re-audit to update" : "Ready to audit"}
            </span>
          </>
        )}
      </div>

      <div className={styles.lastAudit} role="group" aria-label="Last audit">
        <span className={styles.mobileLabel}>Last audit</span>
        {date ? (
          <time dateTime={repo.lastAuditedAt ?? undefined}>{date}</time>
        ) : (
          <span>{repo.hasReport ? "Date unavailable" : "—"}</span>
        )}
      </div>

      <div className={styles.repoActions}>
        <Button
          variant={repo.hasReport ? "ghost" : "default"}
          className={cn(
            styles.action,
            repo.hasReport ? styles.quietAction : styles.primaryAction,
          )}
          onClick={() => onAudit(repo)}
          disabled={isAuditing}
          aria-describedby={error ? errorId : undefined}
        >
          {isAuditing ? (
            <Loader2
              size={14}
              className="motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : repo.hasReport ? (
            <RotateCcw size={14} aria-hidden="true" />
          ) : (
            <ScanLine size={14} aria-hidden="true" />
          )}
          <span>
            {isAuditing
              ? "Auditing…"
                : error ? "Retry audit" : repo.hasReport
                ? "Re-audit"
                : "Audit repository"}
          </span>
        </Button>
        {repo.hasReport && (
          <Button
            render={<Link href={reportUrl} />}
            variant="outline"
            className={cn(styles.action, styles.reportAction)}
          >
            View report
          </Button>
        )}
        {isAuditing && (
          <span role="status" className="sr-only">
            Auditing {repo.name}…
          </span>
        )}
      </div>
      {error && (
        <div role="alert" id={errorId} className={styles.auditError}>
          <AlertCircle size={16} aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
    </article>
  );
}
