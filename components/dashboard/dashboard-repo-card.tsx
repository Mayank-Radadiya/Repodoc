"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ExternalLink,
  GitFork,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";
import type { DashboardRepoItem } from "@/src/lib/dashboard";
import { requestAudit } from "@/src/lib/request-audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DashboardRepoCardProps {
  repo: DashboardRepoItem;
  onAuditComplete?: (updatedRepo: DashboardRepoItem) => void;
  fetcher?: typeof fetch;
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  }
  if (score >= 50) {
    return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-700 border-rose-500/20";
}

function getLanguageColor(language: string | null): string {
  if (!language) return "bg-slate-400";
  const colors: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-amber-400",
    Python: "bg-emerald-500",
    Rust: "bg-orange-600",
    Go: "bg-cyan-500",
    Java: "bg-red-500",
    "C++": "bg-pink-500",
    Ruby: "bg-rose-600",
    PHP: "bg-indigo-400",
    HTML: "bg-orange-500",
    CSS: "bg-purple-500",
  };
  return colors[language] ?? "bg-blue-400";
}

export function DashboardRepoCard({
  repo,
  onAuditComplete,
  fetcher,
}: DashboardRepoCardProps): React.JSX.Element {
  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setError(null);

    try {
      const report = await requestAudit(
        { owner: repo.owner, repo: repo.name },
        { fetcher },
      );

      const shareId = "shareId" in report ? report.shareId : null;
      const updated: DashboardRepoItem = {
        ...repo,
        hasReport: true,
        healthScore: report.healthScore,
        shareId: shareId ?? repo.shareId,
        lastAuditedAt: new Date().toISOString(),
      };

      onAuditComplete?.(updated);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to audit repository.";
      setError(message);
    } finally {
      setIsAuditing(false);
    }
  };

  const reportUrl = `/report/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a
                href={repo.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="group/title inline-flex items-center gap-1.5 truncate text-base font-semibold text-slate-900 transition-colors hover:text-[#005FD6]"
              >
                <span className="truncate">{repo.name}</span>
                <ExternalLink
                  className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-100"
                  aria-hidden="true"
                />
              </a>
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] font-medium tracking-wide uppercase"
              >
                {repo.isPrivate ? "Private" : "Public"}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
              {repo.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Metadata Row */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          {repo.language && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn("size-2 rounded-full", getLanguageColor(repo.language))}
                aria-hidden="true"
              />
              <span>{repo.language}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Star className="size-3.5 text-slate-400" aria-hidden="true" />
            <span>{repo.starsCount}</span>
          </div>

          <div className="flex items-center gap-1">
            <GitFork className="size-3.5 text-slate-400" aria-hidden="true" />
            <span>{repo.forksCount}</span>
          </div>

          <span className="text-[11px] text-slate-400">
            Branch: {repo.defaultBranch}
          </span>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {repo.hasReport && repo.healthScore !== null ? (
          <>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums",
                  getScoreBadgeClass(repo.healthScore),
                )}
              >
                {repo.healthScore}/100
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-slate-700"
                onClick={handleAudit}
                disabled={isAuditing}
              >
                {isAuditing ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                )}
                <span>{isAuditing ? "Auditing…" : "Re-audit"}</span>
              </Button>

              <Button
                render={<Link href={reportUrl} />}
                size="sm"
                className="h-8 text-xs bg-[#005FD6] text-white hover:bg-[#0051b8]"
              >
                View Report
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
              Not audited yet
            </span>

            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-[#005FD6] text-white hover:bg-[#0051b8]"
              onClick={handleAudit}
              disabled={isAuditing}
            >
              {isAuditing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>Auditing…</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  <span>Audit Repository</span>
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
