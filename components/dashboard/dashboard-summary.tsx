import type { DashboardData } from "@/src/lib/dashboard";
import styles from "./dashboard.module.css";

export function DashboardSummary({ stats, onReviewUnaudited }: {
  stats: DashboardData["stats"];
  onReviewUnaudited?: () => void;
}) {
  const coverage = stats.totalRepos
    ? Math.round((stats.auditedCount / stats.totalRepos) * 100)
    : 0;

  return (
    <section className={styles.summary} aria-label="Repository audit summary">
      <div className={styles.metric}>
        <h2>Repositories</h2>
        <p className={styles.metricValue}>
          {stats.totalRepos.toLocaleString("en-US")}
        </p>
        <p className={styles.secondary}>Loaded from your GitHub account</p>
      </div>
      <div className={`${styles.metric} ${styles.coverage}`}>
        <h2>Audit coverage</h2>
        <div className={styles.coverageValues}>
          <p className={styles.metricValue}>
            {stats.auditedCount} <span>/ {stats.totalRepos}</span>
          </p>
          <span className={styles.coveragePercent}>{coverage}% audited</span>
        </div>
        <div
          role="progressbar"
          aria-label="Audit coverage"
          aria-valuenow={coverage}
          aria-valuemin={0}
          aria-valuemax={100}
          className={styles.coverageTrack}
        >
          <span style={{ width: `${coverage}%` }} />
        </div>
        <p className={styles.secondary}>
          {stats.unauditedCount
            ? `${stats.unauditedCount} ${stats.unauditedCount === 1 ? "repository ready" : "repositories ready"} for an audit`
            : stats.totalRepos
              ? "Every repository has an audit"
              : "Your audits will appear here"}
        </p>
        {stats.unauditedCount > 0 && onReviewUnaudited && (
          <button type="button" className={styles.summaryAction} onClick={onReviewUnaudited}>
            Review unaudited repositories
          </button>
        )}
      </div>
      <div className={styles.metric}>
        <h2>Average health</h2>
        <p className={styles.metricValue}>
          {stats.averageScore ?? "—"}
          {stats.averageScore !== null && <span> / 100</span>}
        </p>
        <p className={styles.secondary}>
          {stats.averageScore !== null
            ? "Across scored repositories"
            : "Run an audit to see your score"}
        </p>
      </div>
    </section>
  );
}
