"use client";

import { ArrowDownWideNarrow, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useId } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import styles from "./dashboard.module.css";

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
  counts?: Record<AuditStatusFilter, number>;
}

const filters: { value: AuditStatusFilter; label: string }[] = [
  { value: "all", label: "All repositories" },
  { value: "audited", label: "Audited" },
  { value: "unaudited", label: "Needs audit" },
];

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
  counts,
}: DashboardToolbarProps) {
  const groupId = useId();
  const reducedMotion = useReducedMotion();
  return (
    <div className={styles.toolbar}>
      <div className={styles.filterHeading}>
        <LayoutGroup id={groupId}>
        <div role="group" aria-label="Audit filter" className={styles.filters}>
          {filters.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-pressed={statusFilter === value}
              aria-label={label}
              onClick={() => onStatusFilterChange(value)}
              className={styles.filterButton}
            >
              {label}
              {counts && <span className={styles.filterCount} aria-hidden="true">{counts[value]}</span>}
              {statusFilter === value && <motion.span className={styles.activeFilter} layoutId="active-filter" transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }} />}
            </button>
          ))}
        </div>
        </LayoutGroup>
        <p role="status" className={styles.resultCount}>
          Showing {totalFiltered}{" "}
          {totalFiltered === 1 ? "repository" : "repositories"}
        </p>
      </div>
      <div className={styles.controls}>
        <div className={styles.search}>
          <Search size={16} aria-hidden="true" className={styles.searchIcon} />
          <Input
            id="repository-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search repositories…"
            aria-label="Search repositories"
            className={styles.searchControl}
          />
          {search && (
            <button
              type="button"
              className={styles.clearSearch}
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={styles.selects}>
          <div className={styles.selectControl}>
            <select
              value={selectedLanguage}
              onChange={(event) => onLanguageChange(event.target.value)}
              aria-label="Filter by language"
            >
              <option value="all">All languages</option>
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
          <div className={styles.selectControl}>
            <select
              value={sortBy}
              onChange={(event) =>
                onSortChange(event.target.value as RepoSortOption)
              }
              aria-label="Sort repositories"
            >
              <option value="updated">Recently updated</option>
              <option value="stars">Most stars</option>
              <option value="score">Highest health score</option>
              <option value="name">Alphabetical</option>
            </select>
            <ArrowDownWideNarrow size={14} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
