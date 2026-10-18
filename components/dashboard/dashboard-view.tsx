"use client";

import React, { useMemo, useState } from "react";
import { FolderSearch, RotateCcw } from "lucide-react";
import type { DashboardData, DashboardRepoItem } from "@/src/lib/dashboard";
import { DashboardProfileCard } from "./dashboard-profile-card";
import {
  DashboardToolbar,
  type AuditStatusFilter,
  type RepoSortOption,
} from "./dashboard-toolbar";
import { DashboardRepoCard } from "./dashboard-repo-card";
import { Button } from "@/components/ui/button";

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

  // Dynamically recalculate stats whenever repos update in-place
  const stats = useMemo(() => {
    const totalRepos = repos.length;
    const auditedCount = repos.filter((r) => r.hasReport).length;
    const unauditedCount = totalRepos - auditedCount;
    const scoredRepos = repos.filter(
      (r) => r.hasReport && r.healthScore !== null,
    );
    const averageScore =
      scoredRepos.length > 0
        ? Math.round(
            scoredRepos.reduce((sum, r) => sum + (r.healthScore ?? 0), 0) /
              scoredRepos.length,
          )
        : null;

    return {
      totalRepos,
      auditedCount,
      unauditedCount,
      averageScore,
    };
  }, [repos]);

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

  const handleAuditComplete = (updatedRepo: DashboardRepoItem) => {
    setRepos((prev) =>
      prev.map((r) => (r.id === updatedRepo.id ? updatedRepo : r)),
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSelectedLanguage("all");
    setSortBy("updated");
  };

  return (
    <div className="flex flex-col gap-8">
      {/* User Profile Card */}
      <DashboardProfileCard user={initialData.user} stats={stats} />

      {/* Filter and Search Bar */}
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
      />

      {/* Repository Cards Grid */}
      {filteredAndSortedRepos.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedRepos.map((repo) => (
            <DashboardRepoCard
              key={repo.id}
              repo={repo}
              onAuditComplete={handleAuditComplete}
              fetcher={fetcher}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center backdrop-blur-md">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-2xs">
            <FolderSearch className="size-7" aria-hidden="true" />
          </div>

          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No repositories found
          </h3>

          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {search || statusFilter !== "all" || selectedLanguage !== "all"
              ? "No repositories match your active search and filter criteria."
              : "No public repositories are currently linked to this GitHub account."}
          </p>

          {(search || statusFilter !== "all" || selectedLanguage !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-5 gap-1.5 text-xs text-slate-700"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Clear filters</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
