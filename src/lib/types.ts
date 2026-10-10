export type CategoryId =
  | "documentation"
  | "hygiene"
  | "testing_ci"
  | "community"
  | "security";

export interface CheckResult {
  id: string;
  name: string;
  category: CategoryId;
  pointsAwarded: number;
  maxPoints: number;
  passed: boolean;
  evidence: {
    filesChecked: string[];
    found: boolean;
    details: string;
  };
  remediation?: {
    canAutomate: boolean;
    targetPath: string;
    description: string;
    requiresUserInput?: "license_selection";
  };
}

export interface AuditReport {
  owner: string;
  repo: string;
  defaultBranch: string;
  healthScore: number;
  rubricVersion: string;
  checks: CheckResult[];
  /** ISO 8601 timestamp suitable for JSON serialization. */
  generatedAt: string;
}

export interface TreeEntry {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
}

export interface RepoTree {
  sha: string;
  tree: TreeEntry[];
  truncated: boolean;
}

/** Successful response body from GET /repos/{owner}/{repo}/git/trees/{tree_sha}. */
export interface GitHubTreeResponse extends RepoTree {
  url: string;
  tree: (TreeEntry & { url?: string })[];
}

export interface BadgeResponse {
  schemaVersion: 1;
  label: string;
  message: string;
  color: "brightgreen" | "green" | "yellow" | "orange" | "red";
}
