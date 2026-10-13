import "server-only";

import type { TreeEntry } from "@/src/lib/types";
import {
  fetchDefaultBranch,
  fetchFileContent,
  fetchReadmeContent,
  fetchRepoTree,
  findReadmeEntry,
  type GitHubRepoMetadata,
} from "./client";

export type GitHubRepoData = GitHubRepoMetadata &
  (
    | { tree: TreeEntry[]; treeSha: string; etag: string; truncated: boolean }
    | { tree: null; treeSha: null; etag: string; truncated: null }
  );

export const GitHubService = {
  /**
   * Fetches fresh metadata and conditionally revalidates the default branch's tree.
   * On 304, tree, treeSha, and truncated are null and the cached ETag is retained;
   * callers must reuse their cached tree. Client errors propagate unchanged.
   */
  async getRepoData(owner: string, repo: string, cachedEtag?: string): Promise<GitHubRepoData> {
    const metadata = await fetchDefaultBranch(owner, repo);
    // GitHub accepts a branch ref in the tree endpoint, avoiding a separate ref lookup.
    const result = await fetchRepoTree(owner, repo, metadata.defaultBranch, cachedEtag);

    if (result.notModified) {
      return {
        ...metadata,
        tree: null,
        treeSha: null,
        etag: cachedEtag ?? "",
        truncated: null,
      };
    }

    return {
      ...metadata,
      tree: result.tree,
      treeSha: result.sha,
      etag: result.etag,
      truncated: result.truncated,
    };
  },

  /**
   * Fetches raw blob content by its Git object SHA.
   */
  async fetchFileContent(
    owner: string,
    repo: string,
    sha: string,
    token?: string,
  ): Promise<string> {
    return fetchFileContent(owner, repo, sha, token);
  },

  /**
   * Fetches decoded README content for a repository.
   * Discovers the README blob within the provided tree, or retrieves the tree if omitted.
   * Returns null if no README is found in the repository.
   */
  async getReadmeContent(
    owner: string,
    repo: string,
    treeOrSha?: readonly TreeEntry[] | string,
    token?: string,
  ): Promise<string | null> {
    return fetchReadmeContent(owner, repo, treeOrSha, token);
  },

  /**
   * Alias for getReadmeContent.
   */
  async fetchReadmeContent(
    owner: string,
    repo: string,
    treeOrSha?: readonly TreeEntry[] | string,
    token?: string,
  ): Promise<string | null> {
    return fetchReadmeContent(owner, repo, treeOrSha, token);
  },
};

export { fetchFileContent, fetchReadmeContent, findReadmeEntry };
