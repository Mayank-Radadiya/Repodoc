"use client";

import React from "react";
import {
  Building2,
  Calendar,
  ExternalLink,
  GitFork,
  Globe,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { UserProfileData, DashboardData } from "@/src/lib/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface DashboardProfileCardProps {
  user: UserProfileData;
  stats: DashboardData["stats"];
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatJoinedDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (!Number.isFinite(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return isoString;
  }
}

export function DashboardProfileCard({
  user,
  stats,
}: DashboardProfileCardProps): React.JSX.Element {
  const coveragePercent =
    stats.totalRepos > 0
      ? Math.round((stats.auditedCount / stats.totalRepos) * 100)
      : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
      {/* Decorative Gradient Glow */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-blue-100/60 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Profile Info Left */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar className="size-20 border-2 border-white shadow-md sm:size-24">
            <AvatarImage src={user.avatarUrl} alt={user.name ?? user.username} />
            <AvatarFallback className="text-xl font-bold bg-slate-100 text-slate-700">
              {user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {user.name || user.username}
                </h1>
                <span className="text-sm font-medium text-slate-500">
                  @{user.username}
                </span>
              </div>

              <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                {user.bio || "No bio available"}
              </p>
            </div>

            {/* Metadata Tags */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              {user.company && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>{user.company}</span>
                </div>
              )}

              {user.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>{user.location}</span>
                </div>
              )}

              {user.website && (
                <div className="flex items-center gap-1.5">
                  <Globe className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <a
                    href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-[#005FD6] hover:underline"
                  >
                    {user.website}
                  </a>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Joined {formatJoinedDate(user.joinedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Right */}
        <div className="flex items-center gap-3">
          <Button
            render={
              <a
                href={user.githubUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="View GitHub Profile"
              />
            }
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-slate-700"
          >
            <span>View GitHub Profile</span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Metric 1: Repositories */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <GitFork className="size-4 text-blue-600" aria-hidden="true" />
            <span>Repositories</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {formatNumber(stats.totalRepos)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Total owned</p>
        </div>

        {/* Metric 2: Followers */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Users className="size-4 text-indigo-600" aria-hidden="true" />
            <span>Followers</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {formatNumber(user.followersCount)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">{user.followingCount} following</p>
        </div>

        {/* Metric 3: Audited Coverage */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
            <span>Audited</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {stats.auditedCount} / {stats.totalRepos}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">{coveragePercent}% scanned</p>
        </div>

        {/* Metric 4: Average Score */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
            <span>Average Score</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {stats.averageScore !== null ? `${stats.averageScore}/100` : "—"}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {stats.averageScore !== null
              ? stats.averageScore >= 80
                ? "Optimal health"
                : stats.averageScore >= 50
                  ? "Fair health"
                  : "Needs improvement"
              : "No audits yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
