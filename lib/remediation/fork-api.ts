import "server-only";

import { REPODOC_BRANCH } from "@/lib/constants";
import {
  createOctokit,
  GitHubApiError,
  toGitHubApiError,
  validatePathParameter,
} from "@/lib/github/client";
import { isRepositoryCoordinates } from "@/lib/report-validation";
import { RemediationError } from "./errors";
import type { BaseCommit } from "./git-api";

export interface RemediationRepository {
  defaultBranch: string;
  push: boolean;
  repositoryId: number;
  networkId: number;
  /** Missing for credentials that do not use OAuth scopes. Empty means no scopes. */
  oauthScopes?: readonly string[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function id(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function invalidResponse(): never {
  throw new GitHubApiError(
    "invalid_response",
    "GitHub returned invalid remediation repository metadata.",
  );
}

function validateInput(owner: string, repo: string, token: string): void {
  if (
    !isRepositoryCoordinates(owner, repo) ||
    typeof token !== "string" ||
    !token.trim()
  ) {
    throw new GitHubApiError(
      "invalid_input",
      "Remediation requires repository coordinates and an explicit token.",
    );
  }
  validatePathParameter(owner);
  validatePathParameter(repo);
}

function metadata(body: unknown): RemediationRepository {
  if (
    !record(body) ||
    !id(body.id) ||
    typeof body.fork !== "boolean" ||
    typeof body.default_branch !== "string" ||
    !body.default_branch.trim() ||
    !record(body.permissions) ||
    typeof body.permissions.push !== "boolean"
  )
    invalidResponse();
  let networkId = body.id;
  if (body.fork) {
    if (!record(body.source) || !id(body.source.id)) invalidResponse();
    networkId = body.source.id;
  }
  return {
    defaultBranch: body.default_branch,
    push: body.permissions.push,
    repositoryId: body.id,
    networkId,
  };
}

/** Reads permissions with the caller's token; absent permissions are never inferred. */
export async function fetchRemediationRepository(
  owner: string,
  repo: string,
  token: string,
): Promise<RemediationRepository> {
  validateInput(owner, repo, token);
  const octokit = createOctokit(token);
  try {
    const response = await octokit.rest.repos.get({ owner, repo });
    const scopes = response.headers["x-oauth-scopes"];
    return {
      ...metadata(response.data),
      ...(typeof scopes === "string"
        ? {
            oauthScopes: scopes
              .split(",")
              .map((scope) => scope.trim())
              .filter(Boolean),
          }
        : {}),
    };
  } catch (error) {
    throw toGitHubApiError(error);
  }
}

/** Requests/reuses a personal fork, then waits for the exact upstream Git objects. */
export async function ensureForkReady(
  owner: string,
  repo: string,
  upstream: RemediationRepository,
  base: BaseCommit,
  token: string,
): Promise<{ owner: string; repo: string }> {
  validateInput(owner, repo, token);
  validatePathParameter(base.commitSha);
  validatePathParameter(base.treeSha);
  if (!id(upstream.repositoryId) || !id(upstream.networkId)) invalidResponse();
  // Polling must not inherit the shared client's rate-limit retry delays.
  const octokit = createOctokit(token, { maxRetries: 0 });
  let fork: unknown;
  let user: unknown;
  try {
    user = (await octokit.rest.users.getAuthenticated()).data;
    if (
      !record(user) ||
      !id(user.id) ||
      typeof user.login !== "string" ||
      !isRepositoryCoordinates(user.login, repo)
    )
      invalidResponse();
    // GitHub returns the existing fork as well, including its actual renamed coordinates.
    fork = (await octokit.rest.repos.createFork({ owner, repo })).data;
  } catch (error) {
    throw toGitHubApiError(error);
  }
  if (
    !record(fork) ||
    !id(fork.id) ||
    !record(fork.owner) ||
    typeof fork.owner.login !== "string" ||
    typeof fork.name !== "string" ||
    !isRepositoryCoordinates(fork.owner.login, fork.name)
  )
    invalidResponse();
  if (
    fork.owner.id !== user.id ||
    fork.owner.login.toLowerCase() !== user.login.toLowerCase() ||
    fork.fork !== true ||
    fork.id === upstream.repositoryId
  ) {
    throw new RemediationError(
      "fork_conflict",
      "The returned repository is not the caller's fork.",
    );
  }
  const coordinates = { owner: fork.owner.login, repo: fork.name };
  const forkId = fork.id;
  const controller = new AbortController();
  const notReady = () =>
    new RemediationError(
      "fork_not_ready",
      "GitHub is still preparing the fork. Try again shortly.",
    );
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(() => {
      reject(notReady());
      controller.abort();
    }, 15_000);
  });
  const request = { signal: controller.signal };
  const poll = async () => {
    while (!controller.signal.aborted) {
      try {
        const response = await octokit.rest.repos.get({
          ...coordinates,
          request,
        });
        const body: unknown = response.data;
        const ready = metadata(body);
        if (!record(body) || !record(body.owner)) invalidResponse();
        if (
          body.id !== forkId ||
          body.owner.id !== user.id ||
          body.fork !== true ||
          body.name !== coordinates.repo ||
          typeof body.owner.login !== "string" ||
          body.owner.login.toLowerCase() !== coordinates.owner.toLowerCase() ||
          ready.networkId !== upstream.networkId ||
          ready.defaultBranch === REPODOC_BRANCH
        ) {
          throw new RemediationError(
            "fork_conflict",
            "The fork cannot safely be used for remediation.",
          );
        }
        if (!ready.push)
          throw new GitHubApiError(
            "forbidden",
            "GitHub denied write access to the fork.",
            { status: 403 },
          );
        const commit = await octokit.rest.git.getCommit({
          ...coordinates,
          commit_sha: base.commitSha,
          request,
        });
        const data: unknown = commit.data;
        if (
          !record(data) ||
          data.sha !== base.commitSha ||
          !record(data.tree) ||
          data.tree.sha !== base.treeSha
        )
          invalidResponse();
        const tree = await octokit.rest.git.getTree({
          ...coordinates,
          tree_sha: base.treeSha,
          request,
        });
        const treeData: unknown = tree.data;
        if (
          !record(treeData) ||
          treeData.sha !== base.treeSha ||
          !Array.isArray(treeData.tree)
        )
          invalidResponse();
        return coordinates;
      } catch (error) {
        if (controller.signal.aborted) throw notReady();
        if (error instanceof RemediationError) throw error;
        const apiError = toGitHubApiError(error);
        if (apiError.status !== 404 && apiError.status !== 409) throw apiError;
      }
      await new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", finish);
          resolve();
        };
        const timer = setTimeout(finish, 1000);
        controller.signal.addEventListener("abort", finish, { once: true });
      });
    }
    throw notReady();
  };
  try {
    return await Promise.race([poll(), deadline]);
  } finally {
    if (deadlineTimer !== undefined) {
      clearTimeout(deadlineTimer);
    }
    controller.abort();
  }
}
