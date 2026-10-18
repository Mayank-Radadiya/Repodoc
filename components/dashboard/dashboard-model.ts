import type { DashboardRepoItem } from "@/lib/dashboard";
import { getBadgeColor } from "@/lib/badge";

export const healthBands = [
  { key: "excellent", label: "Excellent", color: "brightgreen" },
  { key: "good", label: "Good", color: "green" },
  { key: "fair", label: "Fair", color: "yellow" },
  { key: "needsImprovement", label: "Needs improvement", color: "orange" },
  { key: "critical", label: "Critical", color: "red" },
] as const;

export function getHealthBand(score: number) {
  return healthBands.find((band) => band.color === getBadgeColor(score))!;
}

export type DashboardRepository = DashboardRepoItem;

export function hasHealthScore(
  repo: DashboardRepoItem,
): repo is DashboardRepoItem & { healthScore: number } {
  return repo.hasReport && repo.healthScore !== null && Number.isFinite(repo.healthScore);
}

export function hasValidAuditDate(
  repo: DashboardRepository,
): repo is DashboardRepository & { lastAuditedAt: string } {
  return Boolean(
    repo.hasReport &&
    repo.lastAuditedAt &&
    Number.isFinite(Date.parse(repo.lastAuditedAt)),
  );
}

export function formatAuditDate(value: string | null): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(value));
}

export function getDashboardInsights(repos: DashboardRepoItem[]) {
  const scored = repos.filter(hasHealthScore);
  const auditedCount = repos.filter((repo) => repo.hasReport).length;
  const languages = new Map<string, number>();
  let unspecified = 0;
  for (const repo of repos) {
    if (repo.language) languages.set(repo.language, (languages.get(repo.language) ?? 0) + 1);
    else unspecified++;
  }
  const sortedLanguages = [...languages].sort(
    ([a, countA], [b, countB]) => countB - countA || a.localeCompare(b),
  );
  const languageMix = sortedLanguages.slice(0, 4).map(([name, count]) => ({ name, count }));
  const other = sortedLanguages.slice(4).reduce((sum, [, count]) => sum + count, 0);
  if (other) languageMix.push({ name: "Other", count: other });
  if (unspecified) languageMix.push({ name: "Unspecified", count: unspecified });

  return {
    stats: {
      totalRepos: repos.length,
      auditedCount,
      unauditedCount: repos.length - auditedCount,
      averageScore: scored.length ? Math.round(scored.reduce((sum, repo) => sum + repo.healthScore, 0) / scored.length) : null,
    },
    distribution: healthBands.map((band) => ({
      ...band, count: scored.filter((repo) => getHealthBand(repo.healthScore).key === band.key).length,
    })),
    unscoredCount: repos.length - scored.length,
    languageMix,
    latestAudits: repos
      .filter(hasValidAuditDate)
      .sort((a, b) => Date.parse(b.lastAuditedAt) - Date.parse(a.lastAuditedAt) || a.name.localeCompare(b.name))
      .slice(0, 4),
  };
}

export type DashboardInsights = ReturnType<typeof getDashboardInsights>;
export type RepositoryAuditState = {
  pending: boolean;
  error: string | null;
  completed?: boolean;
};
