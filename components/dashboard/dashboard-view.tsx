"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Info, FolderSearch, RotateCcw } from "lucide-react";
import type { DashboardData, DashboardRepoItem } from "@/lib/dashboard";
import { DashboardProfileCard } from "./dashboard-profile-card";
import {
  DashboardToolbar,
  type AuditStatusFilter,
  type RepoSortOption,
} from "./dashboard-toolbar";
import { DashboardRepoCard } from "./dashboard-repo-card";
import { Button } from "@/components/ui/button";
import { DashboardSummary } from "./dashboard-summary";
import { DashboardInsightsPanel } from "./dashboard-insights";
import { getDashboardInsights, type RepositoryAuditState } from "./dashboard-model";
import { requestAudit } from "@/lib/request-audit";
import styles from "./dashboard.module.css";

export interface DashboardViewProps {
  initialData: DashboardData;
  fetcher?: typeof fetch;
}

export function DashboardView({
  initialData,
  fetcher,
}: DashboardViewProps): React.JSX.Element {
  const [repos, setRepos] = useState<DashboardRepoItem[]>(
    initialData.repositories,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [sortBy, setSortBy] = useState<RepoSortOption>("updated");
  const [auditStates, setAuditStates] = useState<Record<number, RepositoryAuditState>>({});
  const pendingAudits = useRef(new Map<number, AbortController>());
  const interruptedAudits = useRef(new Set<number>());
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    let active = true;
    const requests = pendingAudits.current;
    const interruptedIds = interruptedAudits.current;
    const interrupted = new Set(interruptedIds);
    interruptedIds.clear();
    queueMicrotask(() => {
      if (!active || !interrupted.size) return;
      setAuditStates((previous) => Object.fromEntries(Object.entries(previous).map(([id, state]) => [
        id, interrupted.has(Number(id)) && state.pending ? { pending: false, error: "Audit interrupted. Try again." } : state,
      ])));
    });
    return () => {
      active = false;
      for (const id of requests.keys()) interruptedIds.add(id);
      for (const controller of requests.values()) controller.abort();
      requests.clear();
    };
  }, []);

  const insights = useMemo(() => getDashboardInsights(repos), [repos]);
  const { stats } = insights;

  // Extract unique languages
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    for (const r of repos) {
      if (r.language) {
        set.add(r.language);
      }
    }
    return Array.from(set).sort();
  }, [repos]);

  // Filter & sort repositories
  const filteredAndSortedRepos = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = repos.filter((r) => {
      // Search text match
      if (query) {
        const nameMatch = r.name.toLowerCase().includes(query);
        const descMatch = (r.description ?? "").toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }

      // Status filter
      if (statusFilter === "audited" && !r.hasReport) return false;
      if (statusFilter === "unaudited" && r.hasReport) return false;

      // Language filter
      if (selectedLanguage !== "all" && r.language !== selectedLanguage) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "stars") {
        return b.starsCount - a.starsCount;
      }
      if (sortBy === "score") {
        return (b.healthScore ?? -1) - (a.healthScore ?? -1);
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      // default: updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [repos, search, statusFilter, selectedLanguage, sortBy]);

  const handleAudit = async (repo: DashboardRepoItem) => {
    if (pendingAudits.current.has(repo.id)) return;
    const controller = new AbortController();
    pendingAudits.current.set(repo.id, controller);
    setAuditStates((prev) => ({ ...prev, [repo.id]: { pending: true, error: null } }));
    setAnnouncement(`Auditing ${repo.name}…`);
    try {
      const report = await requestAudit({ owner: repo.owner, repo: repo.name }, { fetcher, signal: controller.signal });
      if (controller.signal.aborted || pendingAudits.current.get(repo.id) !== controller) return;
      setRepos((prev) => prev.map((item) => item.id === repo.id ? {
        ...item,
        hasReport: true,
        healthScore: report.healthScore,
        shareId: report.shareId,
        lastAuditedAt: report.generatedAt,
      } : item));
      setAuditStates((prev) => ({ ...prev, [repo.id]: { pending: false, error: null, completed: true } }));
      setAnnouncement(`Audit complete for ${repo.name}. Health score ${report.healthScore} out of 100.`);
    } catch (error) {
      if (controller.signal.aborted || pendingAudits.current.get(repo.id) !== controller) return;
      const message = error instanceof Error ? error.message : "Unable to audit repository. Try again.";
      setAuditStates((prev) => ({ ...prev, [repo.id]: { pending: false, error: message } }));
      setAnnouncement(`Audit failed for ${repo.name}. ${message}`);
    } finally {
      if (pendingAudits.current.get(repo.id) === controller) pendingAudits.current.delete(repo.id);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSelectedLanguage("all");
    setSortBy("updated");
  };

  const reviewUnaudited = () => {
    clearFilters();
    setStatusFilter("unaudited");
    resultsHeading.current?.focus();
  };

  const hasFilters = Boolean(
    search || statusFilter !== "all" || selectedLanguage !== "all",
  );

  return (
    <div className={styles.view}>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.pageTitle}>Repository overview</h1>
          <p className={styles.pageDescription}>
            Track repository health and keep your audits up to date.
          </p>
        </div>
        <DashboardProfileCard user={initialData.user} />
      </div>
      <DashboardSummary stats={stats} onReviewUnaudited={reviewUnaudited} />
      <p className={styles.scopeNote}>Showing up to 100 owned repositories from GitHub. Insights reflect the repositories loaded here.</p>
      <div className={styles.workspaceBody}>
      <section className={styles.collection} aria-labelledby="repository-results-title">
        <div className={styles.collectionHeading}>
          <h2 id="repository-results-title" ref={resultsHeading} tabIndex={-1}>Your repositories</h2>
          <span className={styles.collectionTotal}>{repos.length} loaded</span>
        </div>
        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          languages={availableLanguages}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalFiltered={filteredAndSortedRepos.length}
          counts={{ all: stats.totalRepos, audited: stats.auditedCount, unaudited: stats.unauditedCount }}
        />
        {filteredAndSortedRepos.length > 0 ? (
          <div className={styles.repoList}>
            <div className={styles.listHeading} aria-hidden="true">
              <span>Repository</span>
              <span>Health</span>
              <span>Last audit</span>
              <span>Actions</span>
            </div>
            <ul className={styles.repoItems} aria-label="Repositories">
              {filteredAndSortedRepos.map((repo) => (
                <li key={repo.id}>
                  <DashboardRepoCard
                    repo={repo}
                    onAudit={handleAudit}
                    auditState={auditStates[repo.id]}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <FolderSearch size={24} aria-hidden="true" />
            </div>
            <h2>
              {hasFilters
                ? "No repositories found"
                : "Your repositories start here"}
            </h2>
            <p>
              {hasFilters
                ? "Try a different search or clear your filters to see all repositories."
                : "There are no repositories available for this account. Create a repository on GitHub, then return to run your first audit."}
            </p>
            {hasFilters ? (
              <Button
                variant="outline"
                onClick={clearFilters}
                className={`${styles.action} ${styles.reportAction}`}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Clear filters
              </Button>
            ) : (
              <Button
                render={
                  <a
                    href={initialData.user.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                className={`${styles.action} ${styles.primaryAction}`}
              >
                Open GitHub profile
              </Button>
            )}
          </div>
        )}
      </section>
      <DashboardInsightsPanel insights={insights} />
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className={announcement ? styles.auditAnnouncement : "sr-only"}>
        {announcement && <Info size={16} aria-hidden="true" />}
        <span>{announcement}</span>
      </div>
    </div>
  );
}
