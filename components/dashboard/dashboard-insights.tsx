import Link from "next/link";
import { ArrowUpRight, ChartNoAxesColumn, Clock3 } from "lucide-react";
import { formatAuditDate, getHealthBand, hasHealthScore, type DashboardInsights } from "./dashboard-model";
import styles from "./dashboard.module.css";

export function DashboardInsightsPanel({ insights }: { insights: DashboardInsights }) {
  const { stats, distribution, unscoredCount, languageMix, latestAudits } = insights;
  return (
    <aside className={styles.insights} aria-label="Repository insights and latest audits">
      <section className={styles.insightPanel} aria-labelledby="repository-insights-title">
        <div className={styles.panelHeading}>
          <ChartNoAxesColumn size={16} aria-hidden="true" />
          <h2 id="repository-insights-title">Repository insights</h2>
        </div>
        <h3 className={styles.insightLabel}>Health distribution</h3>
        <p className={styles.secondary}>Across {stats.totalRepos} loaded {stats.totalRepos === 1 ? "repository" : "repositories"}</p>
        <div className={styles.distribution} aria-hidden="true">
          {distribution.filter((band) => band.count > 0).map((band) => (
            <span key={band.key} className={styles[band.key]} style={{ flex: band.count }} />
          ))}
          {unscoredCount > 0 && <span className={styles.unscoredSegment} style={{ flex: unscoredCount }} />}
        </div>
        <dl className={styles.legend} aria-label="Repository health distribution">
          {distribution.map((band) => (
            <div key={band.key} className={styles[band.key]}>
              <dt><span className={styles.legendDot} aria-hidden="true" />{band.label}</dt>
              <dd>{band.count}</dd>
            </div>
          ))}
          <div><dt><span className={`${styles.legendDot} ${styles.unscoredDot}`} aria-hidden="true" />Unscored</dt><dd>{unscoredCount}</dd></div>
        </dl>
        {!stats.auditedCount && <p className={styles.insightNote}>Run your first audit to understand repository health.</p>}
        <div className={styles.languageSection}>
          <h3 className={styles.insightLabel}>Repository languages</h3>
          <p className={styles.secondary}>Counted by repository</p>
          {languageMix.length ? (
            <ul className={styles.languageMix} aria-label="Repository language distribution">
              {languageMix.map(({ name, count }) => (
                <li key={name}>
                  <div><span>{name}</span><span>{count}</span></div>
                  <div className={styles.languageTrack} aria-hidden="true"><span style={{ width: `${count / stats.totalRepos * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className={styles.insightNote}>Language insights appear when repositories are available.</p>}
        </div>
      </section>
      <section className={styles.insightPanel} aria-labelledby="latest-audits-title">
        <div className={styles.panelHeading}>
          <Clock3 size={16} aria-hidden="true" /><h2 id="latest-audits-title">Latest audits</h2>
        </div>
        <p className={styles.secondary}>Latest saved result per repository</p>
        {latestAudits.length ? (
          <ul className={styles.latestAudits}>
            {latestAudits.map((repo) => (
              <li key={repo.id}>
                <Link href={`/report/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`} className={styles.latestAuditLink} aria-label={`View latest audit for ${repo.name}`}>
                  <span className={styles.latestAuditDetails}><span className={styles.latestAuditName}>{repo.name}</span><time dateTime={repo.lastAuditedAt!}>{formatAuditDate(repo.lastAuditedAt)}</time></span>
                  <span className={`${styles.latestScore} ${hasHealthScore(repo) ? styles[getHealthBand(repo.healthScore).key] : ""}`}>{hasHealthScore(repo) ? <>{repo.healthScore}<span>/100</span></> : "Unscored"}</span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <div className={styles.auditPlaceholder}>
          <p>{stats.auditedCount ? "Audit dates unavailable" : "No saved audits yet"}</p>
          <p className={styles.secondary}>{stats.auditedCount ? "Your saved reports are available in the repository list. Re-audit a repository to update its result." : "Audit a repository to see its latest result here."}</p>
        </div>}
      </section>
    </aside>
  );
}
