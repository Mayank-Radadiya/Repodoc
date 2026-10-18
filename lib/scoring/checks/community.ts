import type { CheckResult, RepoTree, TreeEntry } from "@/lib/types";
import { buildPathSet, findFile, findFilesInDir } from "../utils";

export const COMMUNITY_CATEGORY_ID = "community" as const;

export const ISSUE_TEMPLATES_CHECK_ID = "issue-templates" as const;
export const PR_TEMPLATE_CHECK_ID = "pr-template" as const;
export const REPO_METADATA_CHECK_ID = "repo-metadata" as const;

export const ISSUE_TEMPLATES_MAX_POINTS = 4;
export const PR_TEMPLATE_MAX_POINTS = 4;
export const REPO_METADATA_MAX_POINTS = 7;
export const REPO_DESCRIPTION_MAX_POINTS = 4;
export const REPO_TOPICS_MAX_POINTS = 3;
export const COMMUNITY_CATEGORY_MAX_POINTS = 15;

export const COMMUNITY_CHECK_IDS = {
  ISSUE_TEMPLATES: ISSUE_TEMPLATES_CHECK_ID,
  PR_TEMPLATE: PR_TEMPLATE_CHECK_ID,
  REPO_METADATA: REPO_METADATA_CHECK_ID,
} as const;

export const COMMUNITY_CHECK_NAMES = {
  ISSUE_TEMPLATES: "Issue Templates",
  PR_TEMPLATE: "Pull Request Template",
  REPO_METADATA: "Repository Metadata",
} as const;

export const COMMUNITY_MAX_POINTS = {
  ISSUE_TEMPLATES: ISSUE_TEMPLATES_MAX_POINTS,
  PR_TEMPLATE: PR_TEMPLATE_MAX_POINTS,
  REPO_METADATA: REPO_METADATA_MAX_POINTS,
  TOTAL: COMMUNITY_CATEGORY_MAX_POINTS,
} as const;

export const ISSUE_TEMPLATE_CANDIDATES = [
  ".github/ISSUE_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE.yaml",
  ".github/ISSUE_TEMPLATE.yml",
] as const;

export const PR_TEMPLATE_CANDIDATES = [
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/PULL_REQUEST_TEMPLATE.txt",
] as const;

/** Single file candidates for issue templates directly under .github/ */
const ISSUE_TEMPLATE_FILE_CANDIDATES = [
  ".github/issue_template.md",
  ".github/issue_template.yaml",
  ".github/issue_template.yml",
] as const;

/** Directory prefix for issue templates inside .github/ISSUE_TEMPLATE/ */
const ISSUE_TEMPLATE_DIR_PREFIX = ".github/issue_template";

/** Single file candidates for pull request templates directly under .github/ */
const PR_TEMPLATE_FILE_CANDIDATES = [
  ".github/pull_request_template.md",
  ".github/pull_request_template.txt",
] as const;

/** Directory prefix for pull request templates inside .github/PULL_REQUEST_TEMPLATE/ */
const PR_TEMPLATE_DIR_PREFIX = ".github/pull_request_template";

/**
 * Normalizes an input to a Set of lowercased paths.
 * Supports Set<string>, readonly TreeEntry[], or RepoTree containers.
 */
function toLowerPathSet(
  input: Set<string> | readonly TreeEntry[] | RepoTree,
): Set<string> {
  if (input instanceof Set) {
    let hasUpper = false;
    for (const p of input) {
      if (p !== p.toLowerCase()) {
        hasUpper = true;
        break;
      }
    }
    if (!hasUpper) {
      return input;
    }
    const normalized = new Set<string>();
    for (const p of input) {
      normalized.add(p.toLowerCase());
    }
    return normalized;
  }

  return buildPathSet(input);
}

/**
 * Checks for the presence of issue templates in .github/ISSUE_TEMPLATE/ or .github/ISSUE_TEMPLATE.md.
 *
 * Awards 4 points if found, 0 points otherwise.
 *
 * @param paths - Lowercased repository paths set, TreeEntry array, or RepoTree
 * @returns CheckResult with ID 'issue-templates'
 */
export function checkIssueTemplates(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): CheckResult {
  const pathSet = toLowerPathSet(paths);

  const singleFile = findFile(pathSet, ISSUE_TEMPLATE_FILE_CANDIDATES);
  const dirFiles = findFilesInDir(pathSet, ISSUE_TEMPLATE_DIR_PREFIX).sort();

  const matchedFiles: string[] = [];
  if (singleFile) {
    matchedFiles.push(singleFile);
  }
  for (const file of dirFiles) {
    if (!matchedFiles.includes(file)) {
      matchedFiles.push(file);
    }
  }

  const passed = matchedFiles.length > 0;
  const pointsAwarded = passed ? COMMUNITY_MAX_POINTS.ISSUE_TEMPLATES : 0;

  let details: string;
  if (passed) {
    if (dirFiles.length > 0 && singleFile) {
      details = `Found issue template file (${singleFile}) and ${dirFiles.length} template(s) in .github/ISSUE_TEMPLATE/: ${dirFiles.join(", ")}.`;
    } else if (dirFiles.length > 0) {
      details = `Found ${dirFiles.length} issue template(s) in .github/ISSUE_TEMPLATE/: ${dirFiles.join(", ")}.`;
    } else {
      details = `Found issue template: ${singleFile}.`;
    }
  } else {
    details =
      "No issue templates found in .github/ISSUE_TEMPLATE/ or .github/ISSUE_TEMPLATE.md.";
  }

  return {
    id: COMMUNITY_CHECK_IDS.ISSUE_TEMPLATES,
    name: COMMUNITY_CHECK_NAMES.ISSUE_TEMPLATES,
    category: "community",
    pointsAwarded,
    maxPoints: COMMUNITY_MAX_POINTS.ISSUE_TEMPLATES,
    passed,
    evidence: {
      filesChecked:
        matchedFiles.length > 0
          ? matchedFiles
          : [".github/ISSUE_TEMPLATE/", ".github/ISSUE_TEMPLATE.md"],
      found: passed,
      details,
    },
    remediation: passed
      ? undefined
      : {
          canAutomate: false,
          targetPath: ".github/ISSUE_TEMPLATE/bug_report.md",
          description:
            "Add issue templates in .github/ISSUE_TEMPLATE/ or create .github/ISSUE_TEMPLATE.md to help contributors submit clear issues.",
        },
  };
}

/**
 * Checks for the presence of a pull request template in .github/PULL_REQUEST_TEMPLATE.md
 * or files inside .github/PULL_REQUEST_TEMPLATE/.
 *
 * Awards 4 points if found, 0 points otherwise.
 *
 * @param paths - Lowercased repository paths set, TreeEntry array, or RepoTree
 * @returns CheckResult with ID 'pr-template'
 */
export function checkPRTemplate(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): CheckResult {
  const pathSet = toLowerPathSet(paths);

  const singleFile = findFile(pathSet, PR_TEMPLATE_FILE_CANDIDATES);
  const dirFiles = findFilesInDir(pathSet, PR_TEMPLATE_DIR_PREFIX).sort();

  const matchedFiles: string[] = [];
  if (singleFile) {
    matchedFiles.push(singleFile);
  }
  for (const file of dirFiles) {
    if (!matchedFiles.includes(file)) {
      matchedFiles.push(file);
    }
  }

  const passed = matchedFiles.length > 0;
  const pointsAwarded = passed ? COMMUNITY_MAX_POINTS.PR_TEMPLATE : 0;

  let details: string;
  if (passed) {
    if (dirFiles.length > 0 && singleFile) {
      details = `Found pull request template file (${singleFile}) and ${dirFiles.length} template(s) in .github/PULL_REQUEST_TEMPLATE/: ${dirFiles.join(", ")}.`;
    } else if (dirFiles.length > 0) {
      details = `Found ${dirFiles.length} pull request template(s) in .github/PULL_REQUEST_TEMPLATE/: ${dirFiles.join(", ")}.`;
    } else {
      details = `Found pull request template: ${singleFile}.`;
    }
  } else {
    details =
      "No pull request template found in .github/PULL_REQUEST_TEMPLATE.md or .github/PULL_REQUEST_TEMPLATE/.";
  }

  return {
    id: COMMUNITY_CHECK_IDS.PR_TEMPLATE,
    name: COMMUNITY_CHECK_NAMES.PR_TEMPLATE,
    category: "community",
    pointsAwarded,
    maxPoints: COMMUNITY_MAX_POINTS.PR_TEMPLATE,
    passed,
    evidence: {
      filesChecked:
        matchedFiles.length > 0
          ? matchedFiles
          : [
              ".github/PULL_REQUEST_TEMPLATE.md",
              ".github/PULL_REQUEST_TEMPLATE/",
            ],
      found: passed,
      details,
    },
    remediation: passed
      ? undefined
      : {
          canAutomate: false,
          targetPath: ".github/pull_request_template.md",
          description:
            "Create .github/pull_request_template.md to provide a checklist and guidelines for incoming pull requests.",
        },
  };
}

export interface RepoMetadataInput {
  description?: string | null;
  topics?: readonly string[] | null;
}

/**
 * Checks that repository description is non-empty (4 pts) and at least 1 topic exists (3 pts).
 * Total max points: 7.
 *
 * @param metadata - Object containing description and topics, or description string
 * @param topics - Optional topics array when description is passed as first argument
 * @returns CheckResult with ID 'repo-metadata'
 */
export function checkRepoMetadata(
  metadata?: RepoMetadataInput,
): CheckResult;
export function checkRepoMetadata(
  description?: string | null,
  topics?: readonly string[] | null,
): CheckResult;
export function checkRepoMetadata(
  descriptionOrMetadata?: string | null | RepoMetadataInput,
  maybeTopics?: readonly string[] | null,
): CheckResult {
  let description: string | null | undefined;
  let topics: readonly string[] | null | undefined;

  if (
    typeof descriptionOrMetadata === "object" &&
    descriptionOrMetadata !== null &&
    !Array.isArray(descriptionOrMetadata)
  ) {
    description = descriptionOrMetadata.description;
    topics = descriptionOrMetadata.topics;
  } else {
    description = typeof descriptionOrMetadata === "string" ? descriptionOrMetadata : null;
    topics = maybeTopics;
  }

  const hasDescription =
    typeof description === "string" && description.trim().length > 0;

  const validTopics: string[] = Array.isArray(topics)
    ? topics
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
    : [];
  const hasTopics = validTopics.length > 0;

  let pointsAwarded = 0;
  if (hasDescription) {
    pointsAwarded += 4;
  }
  if (hasTopics) {
    pointsAwarded += 3;
  }

  const passed = pointsAwarded === COMMUNITY_MAX_POINTS.REPO_METADATA;

  let details: string;
  let remediationDescription: string | undefined;

  if (hasDescription && hasTopics) {
    const trimmed = (description as string).trim();
    const preview = trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
    details = `Repository has a non-empty description ("${preview}") and ${validTopics.length} topic(s) (${validTopics.join(", ")}).`;
  } else if (hasDescription && !hasTopics) {
    const trimmed = (description as string).trim();
    const preview = trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
    details = `Repository has a non-empty description ("${preview}"), but no repository topics are set (expected at least 1 topic).`;
    remediationDescription =
      "Add at least one repository topic in the repository's 'About' section on GitHub to improve discoverability.";
  } else if (!hasDescription && hasTopics) {
    details = `Repository has ${validTopics.length} topic(s) (${validTopics.join(", ")}), but repository description is missing or empty.`;
    remediationDescription =
      "Add a repository description in the repository's 'About' section on GitHub to clearly explain the project purpose.";
  } else {
    details =
      "Repository description is missing or empty, and no repository topics are set.";
    remediationDescription =
      "Add a repository description and at least one topic in the repository's 'About' section on GitHub.";
  }

  return {
    id: COMMUNITY_CHECK_IDS.REPO_METADATA,
    name: COMMUNITY_CHECK_NAMES.REPO_METADATA,
    category: "community",
    pointsAwarded,
    maxPoints: COMMUNITY_MAX_POINTS.REPO_METADATA,
    passed,
    evidence: {
      filesChecked: [],
      found: passed,
      details,
    },
    remediation: passed
      ? undefined
      : {
          canAutomate: false,
          targetPath: "GitHub Repository Settings",
          description: remediationDescription ?? "",
        },
  };
}

/**
 * Runs all Community & Metadata checks (15 points total).
 *
 * @param paths - Lowercased repository paths set, TreeEntry array, or RepoTree
 * @param metadata - Repository metadata including description and topics
 * @returns Array of CheckResult objects for the community category
 */
export function checkCommunity(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
  metadata?: RepoMetadataInput,
): CheckResult[] {
  return [
    checkIssueTemplates(paths),
    checkPRTemplate(paths),
    checkRepoMetadata(metadata),
  ];
}
