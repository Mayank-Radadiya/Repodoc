import "server-only";

import { REPODOC_BRANCH } from "@/src/lib/constants";
import { fetchRepoTree, GitHubApiError } from "@/src/lib/github/client";
import {
  isAuditReport,
  isRepositoryCoordinates,
} from "@/src/lib/report-validation";
import {
  checkCodeOfConduct,
  checkGitignore,
  checkLicense,
} from "@/src/lib/scoring/checks/hygiene";
import { checkSecurityPolicy } from "@/src/lib/scoring/checks/security";
import { checkCIWorkflow } from "@/src/lib/scoring/checks/testing";
import { buildPathSet } from "@/src/lib/scoring/utils";
import {
  CI_WORKFLOW_TARGET_PATH,
  CODE_OF_CONDUCT_TARGET_PATH,
  GITIGNORE_TARGET_PATH,
  LICENSE_TARGET_PATH,
  SECURITY_POLICY_TARGET_PATH,
  generateCIWorkflow,
  renderCodeOfConduct,
  renderGitignore,
  renderLicense,
  renderSecurityPolicy,
  type SupportedLicenseId,
} from "@/src/lib/templates";
import type { AuditReport, TreeEntry } from "@/src/lib/types";
import {
  createBlob,
  createCommit,
  createOrUpdateBranch,
  createTree,
  fetchBaseCommit,
  openPullRequest,
  type TreeBlob,
} from "./git-api";
import { RemediationError } from "./errors";
import { ensureForkReady, fetchRemediationRepository } from "./fork-api";

export { RemediationError, type RemediationErrorCode } from "./errors";

export interface RemediationEngineInput {
  report: AuditReport;
  fixes: readonly string[];
  /** Explicit caller credential; never falls back to an environment token. */
  token: string;
  licenseChoice?: SupportedLicenseId;
  licenseFullName?: string;
  /** Defaults to the current UTC year. */
  licenseYear?: number;
  codeOfConductContact?: string;
}

export interface RemediationResult {
  prUrl: string;
  filesCreated: string[];
}

// Report-provided target paths never control writes.
const FIXES = {
  license: { path: LICENSE_TARGET_PATH, check: checkLicense },
  gitignore: { path: GITIGNORE_TARGET_PATH, check: checkGitignore },
  "ci-workflow": { path: CI_WORKFLOW_TARGET_PATH, check: checkCIWorkflow },
  "security-policy": {
    path: SECURITY_POLICY_TARGET_PATH,
    check: checkSecurityPolicy,
  },
  "code-of-conduct": {
    path: CODE_OF_CONDUCT_TARGET_PATH,
    check: checkCodeOfConduct,
  },
} as const;
type FixId = keyof typeof FIXES;

function invalidInput(message: string): never {
  throw new RemediationError("invalid_input", message);
}

async function execute(
  input: RemediationEngineInput,
): Promise<RemediationResult> {
  if (!input || typeof input !== "object" || !isAuditReport(input.report)) {
    invalidInput("Remediation requires a valid audit report.");
  }
  const { owner, repo } = input.report;
  if (!isRepositoryCoordinates(owner, repo)) {
    invalidInput("Remediation requires valid repository coordinates.");
  }
  const { token } = input;
  if (typeof token !== "string" || token.trim().length === 0) {
    invalidInput("Remediation requires an explicit GitHub token.");
  }
  try {
    new Headers({ Authorization: `Bearer ${token.trim()}` });
  } catch {
    invalidInput("Remediation requires a valid GitHub token.");
  }
  if (!Array.isArray(input.fixes) || input.fixes.length === 0) {
    invalidInput("Select at least one remediation fix.");
  }
  const selected: FixId[] = [];
  for (const id of input.fixes) {
    if (
      typeof id !== "string" ||
      !Object.prototype.hasOwnProperty.call(FIXES, id)
    ) {
      invalidInput("Selected remediation fix is unsupported.");
    }
    const check = input.report.checks.find((candidate) => candidate.id === id);
    if (!check || check.passed || check.remediation?.canAutomate !== true) {
      invalidInput(
        "Selected fixes must be failed, automatable checks in the audit report.",
      );
    }
    const fix = id as FixId;
    if (!selected.includes(fix)) selected.push(fix);
  }

  // Validate required user input before any network requests, even for stale findings.
  let licenseContent = "";
  let conductContent = "";
  try {
    if (selected.includes("license")) {
      if (
        typeof input.licenseChoice !== "string" ||
        typeof input.licenseFullName !== "string"
      ) {
        invalidInput(
          "License remediation requires a license choice and copyright holder.",
        );
      }
      licenseContent = renderLicense(
        input.licenseChoice,
        input.licenseYear === undefined
          ? new Date().getUTCFullYear()
          : input.licenseYear,
        input.licenseFullName,
      );
    }
    if (selected.includes("code-of-conduct")) {
      if (typeof input.codeOfConductContact !== "string") {
        invalidInput(
          "Code of Conduct remediation requires a reporting contact.",
        );
      }
      conductContent = renderCodeOfConduct({
        contactMethod: input.codeOfConductContact,
      });
    }
  } catch {
    invalidInput(
      "Selected fixes require valid license attribution and reporting contact inputs.",
    );
  }

  const repository = await fetchRemediationRepository(owner, repo, token);
  const { defaultBranch } = repository;
  if (defaultBranch === REPODOC_BRANCH) {
    invalidInput("The default branch cannot be the remediation branch.");
  }
  const { commitSha, treeSha } = await fetchBaseCommit(
    owner,
    repo,
    defaultBranch,
    token,
  );
  const snapshot = await fetchRepoTree(owner, repo, treeSha, undefined, token);
  if (snapshot.notModified || snapshot.truncated || snapshot.sha !== treeSha) {
    throw new GitHubApiError(
      "invalid_response",
      "Remediation requires a complete matching repository tree.",
    );
  }
  const paths = buildPathSet(snapshot.tree);
  const entries = new Map<string, TreeEntry[]>();
  for (const entry of snapshot.tree) {
    const key = entry.path.toLowerCase();
    const matches = entries.get(key);
    if (matches) matches.push(entry);
    else entries.set(key, [entry]);
  }
  const files: { path: string; content: string }[] = [];
  for (const id of selected) {
    const { path, check } = FIXES[id];
    const destination = path.toLowerCase();
    const segments = destination.split("/");
    // An occupied destination is never replaced, even if it is not a regular file.
    const targets = entries.get(destination) ?? [];
    if (
      targets.some(
        (target) =>
          target.type !== "blob" || !["100644", "100755"].includes(target.mode),
      )
    ) {
      throw new RemediationError(
        "path_conflict",
        "A remediation destination is not a regular file.",
      );
    }
    if (check(paths).passed) continue;
    for (let length = 1; length < segments.length; length++) {
      const ancestors = entries.get(segments.slice(0, length).join("/")) ?? [];
      if (
        ancestors.some(
          (ancestor) => ancestor.type !== "tree" || ancestor.mode !== "040000",
        )
      ) {
        throw new RemediationError(
          "path_conflict",
          "A remediation parent path is not a directory.",
        );
      }
    }
    let content: string;
    switch (id) {
      case "license":
        content = licenseContent;
        break;
      case "code-of-conduct":
        content = conductContent;
        break;
      case "gitignore":
        content = renderGitignore(snapshot);
        break;
      case "ci-workflow":
        content = generateCIWorkflow(snapshot, { defaultBranch }).workflow;
        break;
      case "security-policy":
        content = renderSecurityPolicy({ projectName: repo });
        break;
    }
    files.push({ path, content });
  }
  if (files.length === 0) {
    throw new RemediationError(
      "no_changes",
      "All selected remediation findings are already resolved.",
    );
  }

  const target = repository.push
    ? { owner, repo }
    : await ensureForkReady(
        owner,
        repo,
        repository,
        { commitSha, treeSha },
        token,
      );
  const blobs: TreeBlob[] = [];
  for (const file of files) {
    blobs.push({
      path: file.path,
      sha: await createBlob(target.owner, target.repo, file.content, token),
    });
  }
  const newTreeSha = await createTree(
    target.owner,
    target.repo,
    treeSha,
    blobs,
    token,
  );
  const newCommitSha = await createCommit(
    target.owner,
    target.repo,
    newTreeSha,
    commitSha,
    "chore(repodoc): resolve repository health audit findings",
    token,
  );
  await createOrUpdateBranch(target.owner, target.repo, newCommitSha, token);
  const prUrl = await openPullRequest(
    owner,
    repo,
    repository.push ? REPODOC_BRANCH : `${target.owner}:${REPODOC_BRANCH}`,
    defaultBranch,
    token,
  );
  return { prUrl, filesCreated: files.map((file) => file.path) };
}

/** Creates one atomic remediation commit and opens or reuses its pull request. */
export class RemediationEngine {
  static execute(input: RemediationEngineInput): Promise<RemediationResult> {
    return execute(input);
  }

  execute(input: RemediationEngineInput): Promise<RemediationResult> {
    return execute(input);
  }
}

export default RemediationEngine;
