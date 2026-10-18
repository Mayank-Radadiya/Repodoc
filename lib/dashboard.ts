import "server-only";

import { createOctokit, toGitHubApiError } from "@/lib/github/client";
import { prisma } from "@/lib/db";

export interface UserProfileData {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  publicReposCount: number;
  followersCount: number;
  followingCount: number;
  githubUrl: string;
  joinedAt: string;
}

export interface DashboardRepoItem {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  isPrivate: boolean;
  language: string | null;
  starsCount: number;
  forksCount: number;
  defaultBranch: string;
  updatedAt: string;
  githubUrl: string;
  hasReport: boolean;
  healthScore: number | null;
  shareId: string | null;
  lastAuditedAt: string | null;
}

export interface DashboardData {
  user: UserProfileData;
  repositories: DashboardRepoItem[];
  stats: {
    totalRepos: number;
    auditedCount: number;
    unauditedCount: number;
    averageScore: number | null;
  };
}

export async function getDashboardData(
  token: string,
  username: string,
): Promise<DashboardData> {
  const octokit = createOctokit(token);

  let userResponse;
  let reposResponse;

  try {
    [userResponse, reposResponse] = await Promise.all([
      octokit.rest.users.getAuthenticated(),
      octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
        affiliation: "owner",
      }),
    ]);
  } catch (error) {
    throw toGitHubApiError(error);
  }

  const u = userResponse.data;
  const user: UserProfileData = {
    username: u.login,
    name: u.name ?? null,
    avatarUrl: u.avatar_url,
    bio: u.bio ?? null,
    location: u.location ?? null,
    company: u.company ?? null,
    website: u.blog ? (u.blog.trim() || null) : null,
    publicReposCount: typeof u.public_repos === "number" ? u.public_repos : 0,
    followersCount: typeof u.followers === "number" ? u.followers : 0,
    followingCount: typeof u.following === "number" ? u.following : 0,
    githubUrl: u.html_url,
    joinedAt: u.created_at,
  };

  const reports = await prisma.repoReport.findMany({
    where: { owner: username.toLowerCase() },
  });

  const reportsMap = new Map(
    reports.map((report) => [report.repo.toLowerCase(), report]),
  );

  const rawRepos = Array.isArray(reposResponse.data) ? reposResponse.data : [];

  const repositories: DashboardRepoItem[] = rawRepos.map((repo) => {
    const report = reportsMap.get(repo.name.toLowerCase());

    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      description: repo.description ?? null,
      isPrivate: repo.private,
      language: repo.language ?? null,
      starsCount: repo.stargazers_count ?? 0,
      forksCount: repo.forks_count ?? 0,
      defaultBranch: repo.default_branch ?? "main",
      updatedAt: repo.updated_at ?? new Date().toISOString(),
      githubUrl: repo.html_url,
      hasReport: Boolean(report),
      healthScore: report?.healthScore ?? null,
      shareId: report?.shareId ?? null,
      lastAuditedAt: report ? report.updatedAt.toISOString() : null,
    };
  });

  const totalRepos = repositories.length;
  const auditedCount = repositories.filter((r) => r.hasReport).length;
  const unauditedCount = totalRepos - auditedCount;
  const scoredRepos = repositories.filter(
    (r) => r.hasReport && r.healthScore !== null,
  );
  const averageScore =
    scoredRepos.length > 0
      ? Math.round(
          scoredRepos.reduce((acc, curr) => acc + (curr.healthScore ?? 0), 0) /
            scoredRepos.length,
        )
      : null;

  return {
    user,
    repositories,
    stats: {
      totalRepos,
      auditedCount,
      unauditedCount,
      averageScore,
    },
  };
}
