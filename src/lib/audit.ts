import "server-only";

import { GitHubService, findReadmeEntry } from "@/src/lib/github/service";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import { buildPathSet } from "@/src/lib/scoring/utils";
import type { AuditReport } from "@/src/lib/types";

export class IncompleteTreeError extends Error {
  constructor(
    message = "GitHub did not return a complete repository tree. A complete audit is unavailable.",
  ) {
    super(message);
    this.name = "IncompleteTreeError";
  }
}

export class InvalidRepositoryError extends Error {
  constructor(message = "Invalid repository owner or name.") {
    super(message);
    this.name = "InvalidRepositoryError";
  }
}

/**
 * Validates repository owner and name against GitHub naming conventions.
 * - Owner: alphanumeric and hyphens (cannot start/end with hyphen).
 * - Repo: alphanumeric, hyphens, underscores, dots (cannot be '.' or '..').
 */
export function validateRepoCoordinates(
  owner: unknown,
  repo: unknown,
): { owner: string; repo: string } | null {
  if (typeof owner !== "string" || typeof repo !== "string") {
    return null;
  }

  let cleanOwner: string;
  let cleanRepo: string;
  try {
    cleanOwner = decodeURIComponent(owner).trim();
    cleanRepo = decodeURIComponent(repo).trim();
  } catch {
    return null;
  }

  if (
    !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(cleanOwner) ||
    !/^[a-z\d_.-]+$/i.test(cleanRepo) ||
    cleanRepo === "." ||
    cleanRepo === ".."
  ) {
    return null;
  }

  return { owner: cleanOwner, repo: cleanRepo };
}

export interface AuditRepositoryOptions {
  token?: string;
  cachedEtag?: string;
}

/**
 * Performs an end-to-end repository health audit by fetching repo metadata and tree from GitHub,
 * extracting README and manifest contents, and running the rubric scoring engine.
 *
 * Throws GitHubApiError if GitHub API fails (e.g. 404 not found, 429 rate limited).
 * Throws IncompleteTreeError if the tree response is truncated or missing.
 * Throws InvalidRepositoryError if owner or repo are invalid.
 */
export async function auditRepository(
  rawOwner: string,
  rawRepo: string,
  options: AuditRepositoryOptions = {},
): Promise<AuditReport> {
  const validated = validateRepoCoordinates(rawOwner, rawRepo);
  if (!validated) {
    throw new InvalidRepositoryError();
  }

  const { owner, repo } = validated;

  const data = await GitHubService.getRepoData(owner, repo, options.cachedEtag, options.token);
  if (data.tree === null || data.truncated) {
    throw new IncompleteTreeError();
  }

  const readme = findReadmeEntry(data.tree);
  const manifest = data.tree.find(
    (entry) => entry.type === "blob" && entry.path.toLowerCase() === "package.json",
  );

  const [readmeContent, manifestContent] = await Promise.all([
    readme
      ? GitHubService.fetchFileContent(owner, repo, readme.sha, options.token)
      : null,
    manifest
      ? GitHubService.fetchFileContent(owner, repo, manifest.sha, options.token)
      : null,
  ]);

  return ScoringEngine.run({
    owner,
    repo,
    defaultBranch: data.defaultBranch,
    paths: buildPathSet(data.tree),
    readmeContent,
    manifestContent,
    description: data.description,
    topics: data.topics,
  });
}
