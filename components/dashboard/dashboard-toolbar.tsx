"use client";

import React from "react";
import { ArrowUpDown, Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AuditStatusFilter = "all" | "audited" | "unaudited";
export type RepoSortOption = "updated" | "stars" | "score" | "name";

export interface DashboardToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: AuditStatusFilter;
  onStatusFilterChange: (status: AuditStatusFilter) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  languages: string[];
  sortBy: RepoSortOption;
  onSortChange: (sort: RepoSortOption) => void;
  totalFiltered: number;
}

export function DashboardToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedLanguage,
  onLanguageChange,
  languages,
  sortBy,
  onSortChange,
  totalFiltered,
}: DashboardToolbarProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-2xs backdrop-blur-md">
      {/* Search & Selectors Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Field */}
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search repositories by name or description…"
            className="h-10 pl-9 pr-8 text-sm placeholder:text-slate-400"
            aria-label="Search repositories"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label="Clear search"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              aria-label="Filter by language"
              className="h-10 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:border-[#005FD6] focus:outline-none"
            >
              <option value="all">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <Filter
              className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as RepoSortOption)}
              aria-label="Sort repositories"
              className="h-10 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:border-[#005FD6] focus:outline-none"
            >
              <option value="updated">Recently Updated</option>
              <option value="stars">Most Stars</option>
              <option value="score">Highest Health Score</option>
              <option value="name">Alphabetical</option>
            </select>
            <ArrowUpDown
              className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Count Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Audit filter">
          <Button
            variant={statusFilter === "all" ? "default" : "ghost"}
            size="sm"
            role="tab"
            aria-selected={statusFilter === "all"}
            onClick={() => onStatusFilterChange("all")}
            className={cn(
              "h-7 rounded-full px-3 text-xs",
              statusFilter === "all"
                ? "bg-[#005FD6] text-white hover:bg-[#0051b8]"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            All
          </Button>

          <Button
            variant={statusFilter === "audited" ? "default" : "ghost"}
            size="sm"
            role="tab"
            aria-selected={statusFilter === "audited"}
            onClick={() => onStatusFilterChange("audited")}
            className={cn(
              "h-7 rounded-full px-3 text-xs",
              statusFilter === "audited"
                ? "bg-[#005FD6] text-white hover:bg-[#0051b8]"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            Audited
          </Button>

          <Button
            variant={statusFilter === "unaudited" ? "default" : "ghost"}
            size="sm"
            role="tab"
            aria-selected={statusFilter === "unaudited"}
            onClick={() => onStatusFilterChange("unaudited")}
            className={cn(
              "h-7 rounded-full px-3 text-xs",
              statusFilter === "unaudited"
                ? "bg-[#005FD6] text-white hover:bg-[#0051b8]"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            Needs Audit
          </Button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {totalFiltered} {totalFiltered === 1 ? "repository" : "repositories"}
        </span>
      </div>
    </div>
  );
}
