import "server-only";

import { Octokit } from "octokit";
import { RequestError } from "@octokit/request-error";
import type { GitHubTreeResponse, RepoTree, TreeEntry } from "@/src/lib/types";
import { README_CANDIDATES } from "@/src/lib/scoring/checks/documentation";

export interface GitHubRepoMetadata {
  defaultBranch: string;
  description: string | null;
  topics: string[];
}

export type RepoTreeResult =
  | (RepoTree & {
      etag: string;
      notModified: false;
    })
  | { notModified: true };

export type GitHubErrorCode =
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "http_error"
  | "network_error"
  | "invalid_input"
  | "invalid_response";

export class GitHubApiError extends Error {
  readonly code: GitHubErrorCode;
  readonly status: number | undefined;
  /** Delay in seconds from GitHub's Retry-After header. */
  readonly retryAfterSeconds: number | undefined;
  /** UTC epoch seconds from GitHub's X-RateLimit-Reset header. */
  readonly rateLimitResetAt: number | undefined;

  constructor(
    code: GitHubErrorCode,
    message: string,
    options: {
      status?: number;
      retryAfterSeconds?: number;
      rateLimitResetAt?: number;
    } = {},
  ) {
    super(message);
    this.name = "GitHubApiError";
    this.code = code;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.rateLimitResetAt = options.rateLimitResetAt;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTreeEntry(value: unknown): value is TreeEntry & { url?: string } {
  return (
    isRecord(value) &&
    isNonEmptyString(value.path) &&
    isNonEmptyString(value.sha) &&
    (value.mode === "100644" ||
      value.mode === "100755" ||
      value.mode === "040000" ||
      value.mode === "160000" ||
      value.mode === "120000") &&
    (value.type === "blob" || value.type === "tree" || value.type === "commit") &&
    (value.size === undefined ||
      (typeof value.size === "number" && Number.isSafeInteger(value.size) && value.size >= 0)) &&
    (value.url === undefined || typeof value.url === "string")
  );
}

function isGitHubTreeResponse(value: unknown): value is GitHubTreeResponse {
  return (
    isRecord(value) &&
    isNonEmptyString(value.sha) &&
    isNonEmptyString(value.url) &&
    typeof value.truncated === "boolean" &&
    Array.isArray(value.tree) &&
    value.tree.every(isTreeEntry)
  );
}

export interface GitHubBlobResponse {
  sha: string;
  size: number;
  url?: string;
  content: string;
  encoding: string;
  node_id?: string;
}

function isGitHubBlobResponse(value: unknown): value is GitHubBlobResponse {
  return (
    isRecord(value) &&
    isNonEmptyString(value.sha) &&
    typeof value.content === "string" &&
    isNonEmptyString(value.encoding) &&
    typeof value.size === "number" &&
    Number.isSafeInteger(value.size) &&
    value.size >= 0 &&
    (value.url === undefined || typeof value.url === "string") &&
    (value.node_id === undefined || typeof value.node_id === "string")
  );
}

function validatePathParameter(value: string): string {
  if (!isNonEmptyString(value)) {
    throw new GitHubApiError("invalid_input", "GitHub path parameters must not be empty.");
  }

  try {
    encodeURIComponent(value);
  } catch {
    throw new GitHubApiError("invalid_input", "GitHub path parameters must be valid Unicode.");
  }

  return value;
}

function readHeaderValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  const record = headers as Record<string, unknown>;
  const val = record[name.toLowerCase()] ?? record[name];
  return typeof val === "string" ? val : undefined;
}

function readNonNegativeNumber(value: string | undefined | null): number | undefined {
  if (value === null || value === undefined || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function validateHeaderValue(name: string, value: string): void {
  try {
    new Headers({ [name]: value });
  } catch {
    throw new GitHubApiError("invalid_input", "GitHub request headers contain invalid values.");
  }
}

function isRequestError(error: unknown): error is RequestError {
  return (
    error instanceof RequestError ||
    (typeof error === "object" && error !== null && "status" in error && typeof (error as { status: unknown }).status === "number")
  );
}

function toGitHubApiError(error: unknown): GitHubApiError {
  if (error instanceof GitHubApiError) return error;

  if (isRequestError(error)) {
    if (error.response === undefined) {
      return new GitHubApiError("network_error", "Unable to reach the GitHub API.");
    }

    const status = error.status;
    const message = typeof error.message === "string" ? error.message : "";
    const headers = error.response.headers ?? {};
    const retryAfter = readHeaderValue(headers, "retry-after");
    const rateLimitReset = readHeaderValue(headers, "x-ratelimit-reset");
    const rateLimitRemaining = readHeaderValue(headers, "x-ratelimit-remaining");

    const isRateLimited =
      status === 429 ||
      (status === 403 &&
        (rateLimitRemaining === "0" ||
          retryAfter !== undefined ||
          /rate[ -]?limit|abuse detection/i.test(message)));

    if (isRateLimited) {
      return new GitHubApiError("rate_limited", "GitHub API rate limit exceeded. Try again later.", {
        status,
        retryAfterSeconds: readNonNegativeNumber(retryAfter),
        rateLimitResetAt: readNonNegativeNumber(rateLimitReset),
      });
    }

    switch (status) {
      case 404:
        return new GitHubApiError("not_found", "GitHub repository or Git reference was not found or is inaccessible.", { status });
      case 401:
        return new GitHubApiError("unauthorized", "GitHub authentication failed. Check the configured token.", { status });
      case 403:
        return new GitHubApiError("forbidden", "GitHub denied access to this resource.", { status });
      default:
        return new GitHubApiError("http_error", `GitHub API request failed with HTTP ${status}.`, { status });
    }
  }

  return new GitHubApiError("network_error", "Unable to reach the GitHub API.");
}

export function createOctokit(token?: string, options: { maxRetries?: number } = {}): Octokit {
  const resolvedToken = token ?? process.env.GITHUB_TOKEN;
  if (resolvedToken !== undefined && resolvedToken !== "") {
    validateHeaderValue("Authorization", `Bearer ${resolvedToken.trim()}`);
  }

  const maxRetries = options.maxRetries ?? 1;

  const octokit = new Octokit({
    retry: { enabled: false },
    throttle: {
      retryAfterBaseValue: process.env.VITEST ? 0 : 1000,
      onRateLimit: (retryAfter: number, _opts: unknown, _oct: unknown, retryCount: number): boolean => {
        if (retryCount < maxRetries && retryAfter <= 30) {
          return true;
        }
        return false;
      },
      onSecondaryRateLimit: (retryAfter: number, _opts: unknown, _oct: unknown, retryCount: number): boolean => {
        if (retryCount < maxRetries && retryAfter <= 30) {
          return true;
        }
        return false;
      },
    },
    request: {
      fetch: (url: Parameters<typeof fetch>[0], opts: RequestInit = {}): Promise<Response> => {
        return fetch(url, {
          ...opts,
          headers: new Headers(opts.headers),
          cache: "no-store",
        });
      },
    },
  });

  octokit.hook.wrap("request", async (request, reqOpts) => {
    reqOpts.headers["accept"] = "application/vnd.github+json";
    reqOpts.headers["user-agent"] = "Repodoc";
    reqOpts.headers["x-github-api-version"] = "2022-11-28";
    if (resolvedToken?.trim()) {
      reqOpts.headers["authorization"] = `Bearer ${resolvedToken.trim()}`;
    } else {
      delete reqOpts.headers["authorization"];
    }
    return request(reqOpts);
  });

  return octokit;
}

export async function fetchDefaultBranch(
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubRepoMetadata> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);

  const octokit = createOctokit(token);
  let response;
  try {
    response = await octokit.rest.repos.get({
      owner: validatedOwner,
      repo: validatedRepo,
    });
  } catch (error) {
    if (isRequestError(error) && error.status === 304) {
      throw new GitHubApiError("invalid_response", "GitHub returned no repository metadata.", { status: 304 });
    }
    throw toGitHubApiError(error);
  }

  const body = response.data;
  if (
    !isRecord(body) ||
    !isNonEmptyString(body.default_branch) ||
    !(body.description === null || typeof body.description === "string") ||
    !Array.isArray(body.topics) ||
    !body.topics.every((topic: unknown): topic is string => typeof topic === "string")
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned invalid repository metadata.", { status: 200 });
  }

  return {
    defaultBranch: body.default_branch,
    description: body.description,
    topics: body.topics,
  };
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  sha: string,
  etag?: string,
  token?: string,
): Promise<RepoTreeResult> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);
  const validatedSha = validatePathParameter(sha);

  if (etag !== undefined && etag !== "") {
    validateHeaderValue("If-None-Match", etag);
  }

  const octokit = createOctokit(token);
  let response;
  try {
    response = await octokit.rest.git.getTree({
      owner: validatedOwner,
      repo: validatedRepo,
      tree_sha: validatedSha,
      recursive: "1",
      headers: etag ? { "if-none-match": etag } : {},
    });
  } catch (error) {
    if (isRequestError(error) && error.status === 304) {
      return { notModified: true };
    }
    throw toGitHubApiError(error);
  }

  const body = response.data;
  if (!isGitHubTreeResponse(body)) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid repository tree.", { status: 200 });
  }

  if (body.truncated) {
    console.warn("GitHub returned a truncated repository tree; some files are missing from the result.");
  }

  const responseEtag = readHeaderValue(response.headers, "etag") ?? "";

  return {
    tree: body.tree.map(({ path, mode, type, sha: entrySha, size }): TreeEntry => ({
      path,
      mode,
      type,
      sha: entrySha,
      ...(size === undefined ? {} : { size }),
    })),
    sha: body.sha,
    etag: responseEtag,
    truncated: body.truncated,
    notModified: false,
  };
}

/**
 * Fetches the raw content of a Git blob by its SHA and decodes it as UTF-8 text.
 *
 * Calls `GET /repos/{owner}/{repo}/git/blobs/{sha}` and decodes the base64 content payload.
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param sha - 40-character Git blob SHA or object reference
 * @param token - Optional personal access token (falls back to GITHUB_TOKEN environment variable)
 * @returns Decoded UTF-8 content string
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  sha: string,
  token?: string,
): Promise<string> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);
  const validatedSha = validatePathParameter(sha);

  const octokit = createOctokit(token);
  let response;
  try {
    response = await octokit.rest.git.getBlob({
      owner: validatedOwner,
      repo: validatedRepo,
      file_sha: validatedSha,
    });
  } catch (error) {
    if (isRequestError(error) && error.status === 304) {
      throw new GitHubApiError("invalid_response", "GitHub returned no blob content.", { status: 304 });
    }
    throw toGitHubApiError(error);
  }

  const body = response.data;
  if (!isGitHubBlobResponse(body)) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid blob response.", { status: 200 });
  }

  if (body.encoding.toLowerCase() !== "base64") {
    throw new GitHubApiError(
      "invalid_response",
      `GitHub returned unsupported blob encoding: ${body.encoding}.`,
      { status: 200 },
    );
  }

  try {
    return Buffer.from(body.content, "base64").toString("utf-8");
  } catch {
    throw new GitHubApiError("invalid_response", "Failed to decode blob content as UTF-8.");
  }
}

/**
 * Resolves the primary README blob entry from a repository tree according
 * to prioritized candidate paths and standard repository locations.
 *
 * Checks root, .github/, and docs/ locations case-insensitively,
 * matching only Git blob entries.
 *
 * @param tree - Array of tree entries (from fetchRepoTree or GitHubService)
 * @returns The matching TreeEntry, or null if no README blob is found
 */
export function findReadmeEntry(tree: readonly TreeEntry[]): TreeEntry | null {
  const blobs = tree.filter(
    (entry) => entry && entry.type === "blob" && typeof entry.path === "string",
  );
  if (blobs.length === 0) return null;

  for (const candidate of README_CANDIDATES) {
    const candidateLower = candidate.toLowerCase();
    const exactMatch = blobs.find((e) => e.path === candidate);
    if (exactMatch) return exactMatch;

    const caseInsensitiveMatch = blobs.find((e) => e.path.toLowerCase() === candidateLower);
    if (caseInsensitiveMatch) return caseInsensitiveMatch;
  }

  return null;
}

/**
 * Fetches the decoded UTF-8 README content for a repository.
 *
 * If a tree is provided as an array of TreeEntry, finds the README entry from the tree
 * and fetches its blob content. Returns null if no README entry exists in the tree.
 *
 * If a blob SHA string is provided directly, fetches that blob content.
 *
 * If no tree or SHA is provided, discovers the default branch and fetches the repository tree,
 * then retrieves the README content if present.
 *
 * Propagates GitHub API errors (rate limits, 404 repo not found, authentication errors)
 * without masking them as missing READMEs.
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param treeOrSha - Optional tree entries array or blob SHA string
 * @param token - Optional GitHub personal access token
 * @returns Decoded README text, or null if no README file exists in the repository
 */
export async function fetchReadmeContent(
  owner: string,
  repo: string,
  treeOrSha?: readonly TreeEntry[] | string,
  token?: string,
): Promise<string | null> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);

  if (typeof treeOrSha === "string") {
    return fetchFileContent(validatedOwner, validatedRepo, treeOrSha, token);
  }

  let entries: readonly TreeEntry[];
  if (Array.isArray(treeOrSha)) {
    entries = treeOrSha;
  } else {
    const metadata = await fetchDefaultBranch(validatedOwner, validatedRepo, token);
    const treeResult = await fetchRepoTree(
      validatedOwner,
      validatedRepo,
      metadata.defaultBranch,
      undefined,
      token,
    );
    if (treeResult.notModified) {
      return null;
    }
    entries = treeResult.tree;
  }

  const readmeEntry = findReadmeEntry(entries);
  if (!readmeEntry) {
    return null;
  }

  return fetchFileContent(validatedOwner, validatedRepo, readmeEntry.sha, token);
}

export { README_CANDIDATES };
