import "server-only";

import { REPODOC_BRANCH } from "@/src/lib/constants";
import {
  createOctokit,
  GitHubApiError,
  toGitHubApiError,
  validatePathParameter,
} from "@/src/lib/github/client";
import type { TreeEntry } from "@/src/lib/types";

/** A previously created blob and its repository-relative destination. */
export type TreeBlob = Pick<TreeEntry, "path" | "sha">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface BaseCommit {
  commitSha: string;
  treeSha: string;
}

/** Resolves a branch once, then reads the tree belonging to that exact commit. */
export async function fetchBaseCommit(
  owner: string,
  repo: string,
  branch: string,
  token: string,
): Promise<BaseCommit> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);
  const validatedBranch = validatePathParameter(branch);
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new GitHubApiError("invalid_input", "Reading a remediation base requires an explicit token.");
  }

  const octokit = createOctokit(token);
  const ref = `refs/heads/${validatedBranch}`;
  let reference;
  try {
    reference = await octokit.rest.git.getRef({
      owner: validatedOwner,
      repo: validatedRepo,
      ref: `heads/${validatedBranch}`,
    });
  } catch (error) {
    throw toGitHubApiError(error);
  }
  const body: unknown = reference.data;
  if (
    !isRecord(body) || body.ref !== ref || !isRecord(body.object) ||
    body.object.type !== "commit" || typeof body.object.sha !== "string" ||
    body.object.sha.trim().length === 0
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid base reference.", {
      status: reference.status,
    });
  }
  const commitSha = body.object.sha;
  let commit;
  try {
    commit = await octokit.rest.git.getCommit({
      owner: validatedOwner, repo: validatedRepo, commit_sha: commitSha,
    });
  } catch (error) {
    throw toGitHubApiError(error);
  }
  const data: unknown = commit.data;
  if (
    !isRecord(data) || data.sha !== commitSha || !isRecord(data.tree) ||
    typeof data.tree.sha !== "string" || data.tree.sha.trim().length === 0
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid base commit.", {
      status: commit.status,
    });
  }
  return { commitSha, treeSha: data.tree.sha };
}

function readPullRequestUrl(body: unknown, status: number): string {
  if (
    !isRecord(body) ||
    typeof body.html_url !== "string" ||
    body.html_url.trim() !== body.html_url ||
    !/^https:\/\/github\.com\/[^/?#\s]+\/[^/?#\s]+\/pull\/[1-9]\d*$/.test(body.html_url)
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid pull request URL.", { status });
  }
  return body.html_url;
}

/** Escape Markdown and HTML syntax, including line breaks, without changing displayed filenames. */
function escapeFilename(filename: string): string {
  return filename.replace(/[&<>"'\\`*_[\]{}()#+.!|~\r\n]/g, (character) => `&#${character.charCodeAt(0)};`);
}

/**
 * Opens a remediation PR and returns its URL, or finds the existing open PR after HTTP 422.
 * Added filenames are derived from the branch comparison; comparisons at GitHub's 300-file
 * limit are rejected because their file list may be incomplete. Existing PR bodies are retained.
 */
export async function openPullRequest(
  owner: string,
  repo: string,
  head: string,
  base: string,
  token: string,
): Promise<string> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);
  const validatedHead = validatePathParameter(head);
  const validatedBase = validatePathParameter(base);
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new GitHubApiError("invalid_input", "Opening a GitHub pull request requires an explicit token.");
  }

  const octokit = createOctokit(token);
  const comparisonBase = validatedHead.includes(":") ? `${validatedOwner}:${validatedBase}` : validatedBase;
  let comparison;
  try {
    comparison = await octokit.rest.repos.compareCommitsWithBasehead({
      owner: validatedOwner,
      repo: validatedRepo,
      basehead: `${comparisonBase}...${validatedHead}`,
      page: 1,
      per_page: 1,
    });
  } catch (error) {
    throw toGitHubApiError(error);
  }

  const comparisonBody: unknown = comparison.data;
  const files: unknown = isRecord(comparisonBody) ? comparisonBody.files : undefined;
  if (
    !Array.isArray(files) ||
    !files.every((file: unknown): file is { filename: string; status: string } =>
      isRecord(file) &&
      typeof file.filename === "string" && file.filename.trim().length > 0 &&
      typeof file.status === "string" && file.status.trim().length > 0,
    )
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid comparison file list.", {
      status: comparison.status,
    });
  }
  if (files.length >= 300) {
    throw new GitHubApiError("invalid_response", "GitHub's comparison file list may be incomplete.", {
      status: comparison.status,
    });
  }

  const addedFiles = files
    .filter((file) => file.status === "added")
    .map((file) => file.filename)
    .sort();
  const body = [
    "## Repository health remediation",
    "",
    "### Files added",
    "",
    addedFiles.length > 0
      ? addedFiles.map((filename) => `- ${escapeFilename(filename)}`).join("\n")
      : "No added files.",
  ].join("\n");

  let created;
  try {
    created = await octokit.rest.pulls.create({
      owner: validatedOwner,
      repo: validatedRepo,
      head: validatedHead,
      base: validatedBase,
      title: "chore(repodoc): resolve repository health audit findings",
      body,
    });
  } catch (error) {
    const createError = toGitHubApiError(error);
    if (createError.status !== 422) throw createError;

    const qualifiedHead = validatedHead.includes(":") ? validatedHead : `${validatedOwner}:${validatedHead}`;
    const separator = qualifiedHead.indexOf(":");
    const headOwner = qualifiedHead.slice(0, separator).toLowerCase();
    const headBranch = qualifiedHead.slice(separator + 1);
    // A 422 also covers unrelated validation errors; only a matching open PR is success.
    for (let page = 1; ; page++) {
      let existing;
      try {
        existing = await octokit.rest.pulls.list({
          owner: validatedOwner,
          repo: validatedRepo,
          state: "open",
          head: qualifiedHead,
          base: validatedBase,
          per_page: 100,
          page,
        });
      } catch (lookupError) {
        throw toGitHubApiError(lookupError);
      }

      const pulls: unknown = existing.data;
      if (!Array.isArray(pulls) || !pulls.every(isRecord)) {
        throw new GitHubApiError("invalid_response", "GitHub returned an invalid pull request list.", {
          status: existing.status,
        });
      }
      const match = pulls.find((pull) => {
        const label: unknown = isRecord(pull.head) ? pull.head.label : undefined;
        if (typeof label !== "string") return false;
        const split = label.indexOf(":");
        return pull.state === "open" &&
          label.slice(0, split).toLowerCase() === headOwner && label.slice(split + 1) === headBranch &&
          isRecord(pull.base) && pull.base.ref === validatedBase;
      });
      if (match) return readPullRequestUrl(match, existing.status);
      if (pulls.length < 100) throw createError;
    }
  }

  return readPullRequestUrl(created.data, created.status);
}

/**
 * Points the fixed remediation branch at the supplied commit.
 * Existing history on this generated branch is replaced, including divergent commits.
 */
export async function createOrUpdateBranch(
  owner: string,
  repo: string,
  sha: string,
  token: string,
): Promise<void> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);
  const validatedSha = validatePathParameter(sha);

  if (typeof token !== "string" || token.trim().length === 0) {
    throw new GitHubApiError("invalid_input", "Updating a GitHub branch requires an explicit token.");
  }

  const octokit = createOctokit(token);
  const ref = `refs/heads/${REPODOC_BRANCH}`;
  let response;
  try {
    response = await octokit.rest.git.createRef({
      owner: validatedOwner,
      repo: validatedRepo,
      ref,
      sha: validatedSha,
    });
  } catch (error) {
    const apiError = toGitHubApiError(error);
    if (apiError.status !== 422) {
      throw apiError;
    }

    try {
      response = await octokit.rest.git.updateRef({
        owner: validatedOwner,
        repo: validatedRepo,
        ref: `heads/${REPODOC_BRANCH}`,
        sha: validatedSha,
        force: true,
      });
    } catch (updateError) {
      throw toGitHubApiError(updateError);
    }
  }

  const body: unknown = response.data;
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("ref" in body) ||
    body.ref !== ref ||
    !("object" in body) ||
    typeof body.object !== "object" ||
    body.object === null ||
    Array.isArray(body.object) ||
    !("type" in body.object) ||
    body.object.type !== "commit" ||
    !("sha" in body.object) ||
    body.object.sha !== validatedSha
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid branch reference response.", {
      status: response.status,
    });
  }
}

/** Creates a Git blob from UTF-8 text using an explicit caller token and returns its SHA. */
export async function createBlob(
  owner: string,
  repo: string,
  content: string,
  token: string,
): Promise<string> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);

  if (typeof content !== "string") {
    throw new GitHubApiError("invalid_input", "GitHub blob content must be a string.");
  }
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new GitHubApiError("invalid_input", "Creating a GitHub blob requires an explicit token.");
  }

  const octokit = createOctokit(token);
  let response;
  try {
    response = await octokit.rest.git.createBlob({
      owner: validatedOwner,
      repo: validatedRepo,
      content: Buffer.from(content, "utf8").toString("base64"),
      encoding: "base64",
    });
  } catch (error) {
    throw toGitHubApiError(error);
  }

  const body: unknown = response.data;
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("sha" in body) ||
    typeof body.sha !== "string" ||
    body.sha.trim().length === 0
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid created blob response.", {
      status: response.status,
    });
  }

  return body.sha;
}

/**
 * Creates a tree of regular files on top of an existing tree and returns its SHA.
 * The caller is responsible for checking that destination files do not already exist.
 */
export async function createTree(
  owner: string,
  repo: string,
  baseTreeSha: string,
  blobs: readonly TreeBlob[],
  token: string,
): Promise<string> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);
  const validatedBaseTreeSha = validatePathParameter(baseTreeSha);

  if (typeof token !== "string" || token.trim().length === 0) {
    throw new GitHubApiError("invalid_input", "Creating a GitHub tree requires an explicit token.");
  }
  if (!Array.isArray(blobs) || blobs.length === 0) {
    throw new GitHubApiError("invalid_input", "GitHub tree blobs must be a nonempty array.");
  }

  const paths = new Set<string>();
  const tree: (TreeBlob & { mode: "100644"; type: "blob" })[] = [];
  for (const blob of blobs) {
    if (
      typeof blob !== "object" ||
      blob === null ||
      Array.isArray(blob) ||
      typeof blob.sha !== "string" ||
      blob.sha.trim().length === 0
    ) {
      throw new GitHubApiError("invalid_input", "GitHub tree entries must reference a nonempty blob SHA.");
    }

    const path = validatePathParameter(blob.path);
    if (
      path.includes("\0") ||
      path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
      throw new GitHubApiError("invalid_input", "GitHub tree paths must be repository-relative file paths.");
    }
    if (paths.has(path)) {
      throw new GitHubApiError("invalid_input", "GitHub tree paths must be unique.");
    }
    paths.add(path);
    tree.push({ path, sha: blob.sha, mode: "100644", type: "blob" });
  }

  const octokit = createOctokit(token);
  let response;
  try {
    response = await octokit.rest.git.createTree({
      owner: validatedOwner,
      repo: validatedRepo,
      base_tree: validatedBaseTreeSha,
      tree,
    });
  } catch (error) {
    throw toGitHubApiError(error);
  }

  const body: unknown = response.data;
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("sha" in body) ||
    typeof body.sha !== "string" ||
    body.sha.trim().length === 0
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid created tree response.", {
      status: response.status,
    });
  }

  return body.sha;
}

/** Creates a commit with one parent and the supplied message, returning the commit SHA. */
export async function createCommit(
  owner: string,
  repo: string,
  treeSha: string,
  parentSha: string,
  message: string,
  token: string,
): Promise<string> {
  const validatedOwner = validatePathParameter(owner);
  const validatedRepo = validatePathParameter(repo);
  const validatedTreeSha = validatePathParameter(treeSha);
  const validatedParentSha = validatePathParameter(parentSha);

  if (typeof message !== "string" || message.trim().length === 0) {
    throw new GitHubApiError("invalid_input", "GitHub commit messages must be nonempty strings.");
  }
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new GitHubApiError("invalid_input", "Creating a GitHub commit requires an explicit token.");
  }

  const octokit = createOctokit(token);
  let response;
  try {
    response = await octokit.rest.git.createCommit({
      owner: validatedOwner,
      repo: validatedRepo,
      tree: validatedTreeSha,
      parents: [validatedParentSha],
      message,
    });
  } catch (error) {
    throw toGitHubApiError(error);
  }

  const body: unknown = response.data;
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("sha" in body) ||
    typeof body.sha !== "string" ||
    body.sha.trim().length === 0
  ) {
    throw new GitHubApiError("invalid_response", "GitHub returned an invalid created commit response.", {
      status: response.status,
    });
  }

  return body.sha;
}
