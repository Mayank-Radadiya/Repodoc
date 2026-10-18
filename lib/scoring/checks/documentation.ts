import type { CheckResult } from "@/lib/types";
import { findFile } from "@/lib/scoring/utils";

export const README_PRESENCE_MAX_POINTS = 8;
export const README_HEADINGS_MAX_POINTS = 10;
export const ARCHITECTURE_DESCRIPTION_MAX_POINTS = 4;
export const CONTRIBUTING_MAX_POINTS = 3;
export const DOCUMENTATION_MAX_POINTS = 25;

export const README_CANDIDATES = [
  "README.md",
  "README",
  "README.markdown",
  "README.rst",
  "README.txt",
  "README.adoc",
  ".github/README.md",
  ".github/README",
  ".github/README.markdown",
  ".github/README.rst",
  ".github/README.txt",
  ".github/README.adoc",
  "docs/README.md",
  "docs/README",
  "docs/README.markdown",
  "docs/README.rst",
  "docs/README.txt",
  "docs/README.adoc",
] as const;

export const ARCHITECTURE_CANDIDATES = [
  "ARCHITECTURE.md",
  "ARCHITECTURE",
  "ARCHITECTURE.markdown",
  "ARCHITECTURE.rst",
  "ARCHITECTURE.txt",
  ".github/ARCHITECTURE.md",
  ".github/ARCHITECTURE",
  "docs/ARCHITECTURE.md",
  "docs/ARCHITECTURE",
  "docs/architecture.md",
] as const;

export const CONTRIBUTING_CANDIDATES = [
  "CONTRIBUTING.md",
  "CONTRIBUTING",
  "CONTRIBUTING.markdown",
  "CONTRIBUTING.rst",
  "CONTRIBUTING.txt",
  ".github/CONTRIBUTING.md",
  ".github/CONTRIBUTING",
  ".github/CONTRIBUTING.markdown",
  ".github/CONTRIBUTING.rst",
  ".github/CONTRIBUTING.txt",
  "docs/CONTRIBUTING.md",
  "docs/CONTRIBUTING",
  "docs/CONTRIBUTING.markdown",
  "docs/CONTRIBUTING.rst",
  "docs/CONTRIBUTING.txt",
] as const;

/**
 * Strips fenced code blocks, unclosed code blocks at EOF, and HTML comments from markdown text.
 * Prevents code comments (e.g. bash scripts `# ...`) from false-matching as headings.
 */
function stripNonHeadingBlocks(markdown: string): string {
  // Strip fenced code blocks with triple backticks or tildes
  let stripped = markdown.replace(
    /^([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?\n\1\2[ \t]*(?:\n|$)/gm,
    "\n",
  );
  // Strip unclosed code blocks at EOF
  stripped = stripped.replace(/^([ \t]*)(```|~~~)[^\n]*\n[\s\S]*$/gm, "\n");
  // Strip HTML comments
  stripped = stripped.replace(/<!--[\s\S]*?-->/g, "");
  return stripped;
}

/**
 * Normalizes heading text by removing markdown formatting, links, and HTML tags.
 */
function cleanHeadingText(raw: string): string {
  let text = raw.trim();
  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Strip markdown inline links: [title](url) -> title
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Strip markdown reference-style links: [title][ref] -> title
  text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");
  // Strip bold and italic delimiters
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  // Strip inline code backticks
  text = text.replace(/`([^`]+)`/g, "$1");
  return text.trim();
}

/**
 * Extracts all markdown headings from raw markdown content.
 * Supports ATX headings (#), Setext headings (=== / ---), and HTML headings (<h1>..<h6>).
 *
 * @param content - Raw markdown text
 * @returns Array of cleaned heading strings
 */
export function extractMarkdownHeadings(content: string | null | undefined): string[] {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return [];
  }

  const clean = stripNonHeadingBlocks(content);
  const headings: string[] = [];

  // 1. ATX headings: 1-6 '#' characters at start of line with up to 3 spaces of indentation
  const atxRegex = /^[ \t]{0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm;
  let match: RegExpExecArray | null;
  while ((match = atxRegex.exec(clean)) !== null) {
    const cleaned = cleanHeadingText(match[1]);
    if (cleaned.length > 0) {
      headings.push(cleaned);
    }
  }

  // 2. Setext headings: text line followed by underline of = or -
  const lines = clean.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1].trim();
    if (
      line.length > 0 &&
      !line.startsWith("#") &&
      !line.startsWith("-") &&
      !line.startsWith("*") &&
      (nextLine.match(/^={2,}$/) || nextLine.match(/^-{2,}$/))
    ) {
      const cleaned = cleanHeadingText(line);
      if (cleaned.length > 0) {
        headings.push(cleaned);
      }
    }
  }

  // 3. HTML headings: <h1> through <h6>
  const htmlRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  while ((match = htmlRegex.exec(clean)) !== null) {
    const cleaned = cleanHeadingText(match[1]);
    if (cleaned.length > 0) {
      headings.push(cleaned);
    }
  }

  return headings;
}

/**
 * Checks for the presence of a README file in standard repository locations.
 *
 * Evaluates candidate file names including README.md, README, README.rst, README.txt,
 * at the repository root, under .github/, and under docs/.
 *
 * Awards 8 points on match. On failure, returns remediation instructions.
 *
 * @param pathsOrOptions - Set of lowercased file paths or options container
 * @returns CheckResult for README presence check
 */
export function checkReadmePresence(
  pathsOrOptions: Set<string> | { paths: Set<string> },
): CheckResult {
  const paths = pathsOrOptions instanceof Set ? pathsOrOptions : pathsOrOptions.paths;
  const matched = findFile(paths, README_CANDIDATES);
  const passed = matched !== null;

  return {
    id: "readme-presence",
    name: "README file",
    category: "documentation",
    pointsAwarded: passed ? README_PRESENCE_MAX_POINTS : 0,
    maxPoints: README_PRESENCE_MAX_POINTS,
    passed,
    evidence: {
      filesChecked: [...README_CANDIDATES],
      found: passed,
      details: passed
        ? `Found README file: ${matched}`
        : "No README file was found at repository root or standard locations.",
    },
    ...(passed
      ? {}
      : {
          remediation: {
            canAutomate: false,
            targetPath: "README.md",
            description:
              "Create a README.md file at the repository root describing the project's purpose, setup, and usage.",
          },
        }),
  };
}

export interface CheckReadmeHeadingsOptions {
  readmeContent?: string | null;
  paths?: Set<string>;
}

const INSTALLATION_HEADING_REGEX =
  /\b(installation|install|setup|getting[\s_-]*started)\b/i;
const USAGE_HEADING_REGEX =
  /\b(usage|quickstart|quick[\s_-]*start|getting[\s_-]*started|how[\s_-]*to[\s_-]*use)\b/i;

/**
 * Helper to resolve arguments for checks that accept flexible parameter orders.
 */
function resolveContentAndPaths(
  arg1?: string | null | Set<string> | CheckReadmeHeadingsOptions,
  arg2?: string | null | Set<string>,
): { readmeContent: string | null; paths?: Set<string> } {
  if (arg1 instanceof Set) {
    return {
      paths: arg1,
      readmeContent: typeof arg2 === "string" ? arg2 : null,
    };
  }

  if (typeof arg1 === "object" && arg1 !== null) {
    return {
      readmeContent: arg1.readmeContent ?? null,
      paths: arg1.paths,
    };
  }

  return {
    readmeContent: typeof arg1 === "string" ? arg1 : null,
    paths: arg2 instanceof Set ? arg2 : undefined,
  };
}

/**
 * Checks README content for essential headings: Installation/Setup AND Usage/Quickstart.
 *
 * Markdown heading analysis is pure and accepts raw content as a parameter.
 * Requires BOTH an Installation/Setup heading AND a Usage/Quickstart heading.
 *
 * Awards 10 points when both are present, 0 points otherwise.
 *
 * @param readmeContent - Raw README markdown content
 * @param paths - Optional Set of lowercased file paths for repository context
 * @returns CheckResult for README headings check
 */
export function checkReadmeHeadings(
  readmeContent: string | null | undefined,
  paths?: Set<string>,
): CheckResult;
export function checkReadmeHeadings(
  paths: Set<string>,
  readmeContent?: string | null,
): CheckResult;
export function checkReadmeHeadings(
  options: CheckReadmeHeadingsOptions,
): CheckResult;
export function checkReadmeHeadings(
  arg1?: string | null | Set<string> | CheckReadmeHeadingsOptions,
  arg2?: string | null | Set<string>,
): CheckResult {
  const { readmeContent, paths } = resolveContentAndPaths(arg1, arg2);

  // If a path set was explicitly provided and contains no README candidate, fail early
  if (paths !== undefined) {
    const readmeFile = findFile(paths, README_CANDIDATES);
    if (!readmeFile) {
      return {
        id: "readme-headings",
        name: "Essential README sections",
        category: "documentation",
        pointsAwarded: 0,
        maxPoints: README_HEADINGS_MAX_POINTS,
        passed: false,
        evidence: {
          filesChecked: [...README_CANDIDATES],
          found: false,
          details: "README file was not found in repository. Unable to verify essential headings.",
        },
        remediation: {
          canAutomate: false,
          targetPath: "README.md",
          description:
            "Add clear 'Installation' (or 'Setup') and 'Usage' (or 'Quickstart') sections to README.md to help users get started.",
        },
      };
    }
  }

  const resolvedReadmePath =
    paths !== undefined ? findFile(paths, README_CANDIDATES) ?? "README.md" : "README.md";

  if (!readmeContent || readmeContent.trim().length === 0) {
    return {
      id: "readme-headings",
      name: "Essential README sections",
      category: "documentation",
      pointsAwarded: 0,
      maxPoints: README_HEADINGS_MAX_POINTS,
      passed: false,
      evidence: {
        filesChecked: [resolvedReadmePath],
        found: false,
        details: "README content was empty or not provided. Unable to verify essential headings.",
      },
      remediation: {
        canAutomate: false,
        targetPath: resolvedReadmePath,
        description:
          "Add clear 'Installation' (or 'Setup') and 'Usage' (or 'Quickstart') sections to README.md to help users get started.",
      },
    };
  }

  const headings = extractMarkdownHeadings(readmeContent);

  let foundInstallationHeading: string | null = null;
  let foundUsageHeading: string | null = null;

  for (const heading of headings) {
    if (!foundInstallationHeading && INSTALLATION_HEADING_REGEX.test(heading)) {
      foundInstallationHeading = heading;
    }
    if (!foundUsageHeading && USAGE_HEADING_REGEX.test(heading)) {
      // If the heading also matched installation, only share it if distinct or combined
      if (heading !== foundInstallationHeading || /\band\b|&|\+/i.test(heading)) {
        foundUsageHeading = heading;
      }
    }
  }

  // If both were satisfied by the same heading (e.g. "Installation and Usage")
  if (!foundUsageHeading && foundInstallationHeading && USAGE_HEADING_REGEX.test(foundInstallationHeading)) {
    foundUsageHeading = foundInstallationHeading;
  }

  const hasInstallation = foundInstallationHeading !== null;
  const hasUsage = foundUsageHeading !== null;
  const passed = hasInstallation && hasUsage;

  let details: string;
  if (passed) {
    details = `Detected essential documentation headings: found Installation/Setup ('${foundInstallationHeading}') and Usage/Quickstart ('${foundUsageHeading}') in ${resolvedReadmePath}.`;
  } else if (hasInstallation && !hasUsage) {
    details = `Found Installation/Setup heading ('${foundInstallationHeading}'), but missing Usage/Quickstart heading in ${resolvedReadmePath}.`;
  } else if (!hasInstallation && hasUsage) {
    details = `Found Usage/Quickstart heading ('${foundUsageHeading}'), but missing Installation/Setup heading in ${resolvedReadmePath}.`;
  } else {
    details = `Missing essential headings: neither Installation/Setup nor Usage/Quickstart headings were detected in ${resolvedReadmePath}.`;
  }

  return {
    id: "readme-headings",
    name: "Essential README sections",
    category: "documentation",
    pointsAwarded: passed ? README_HEADINGS_MAX_POINTS : 0,
    maxPoints: README_HEADINGS_MAX_POINTS,
    passed,
    evidence: {
      filesChecked: [resolvedReadmePath],
      found: passed,
      details,
    },
    ...(passed
      ? {}
      : {
          remediation: {
            canAutomate: false,
            targetPath: resolvedReadmePath,
            description:
              "Add clear 'Installation' (or 'Setup') and 'Usage' (or 'Quickstart') sections to README.md to help users get started.",
          },
        }),
  };
}

export interface CheckArchitectureOptions {
  readmeContent?: string | null;
  paths?: Set<string>;
}

const ARCHITECTURE_HEADING_REGEX =
  /\b(architecture|overview|design|how[\s_-]*it[\s_-]*works|how[\s_-]*repodoc[\s_-]*works|system[\s_-]*design|system[\s_-]*architecture)\b/i;

/**
 * Checks for high-level architecture or overview description.
 *
 * Looks for headings like Architecture, Overview, Design, How it works in README,
 * or dedicated ARCHITECTURE.md documentation files in standard repository locations.
 *
 * Awards 4 points on match. On failure, returns remediation advice.
 *
 * @param readmeContent - Raw README markdown content
 * @param paths - Optional Set of lowercased file paths
 * @returns CheckResult for architecture description check
 */
export function checkArchitectureDescription(
  readmeContent: string | null | undefined,
  paths?: Set<string>,
): CheckResult;
export function checkArchitectureDescription(
  paths: Set<string>,
  readmeContent?: string | null,
): CheckResult;
export function checkArchitectureDescription(
  options: CheckArchitectureOptions,
): CheckResult;
export function checkArchitectureDescription(
  arg1?: string | null | Set<string> | CheckArchitectureOptions,
  arg2?: string | null | Set<string>,
): CheckResult {
  const { readmeContent, paths } = resolveContentAndPaths(arg1, arg2);

  // 1. Check README headings if content is present
  if (readmeContent && readmeContent.trim().length > 0) {
    const headings = extractMarkdownHeadings(readmeContent);
    const matchedHeading = headings.find((h) => ARCHITECTURE_HEADING_REGEX.test(h));
    if (matchedHeading) {
      const readmePath =
        paths !== undefined ? findFile(paths, README_CANDIDATES) ?? "README.md" : "README.md";

      return {
        id: "architecture-description",
        name: "Architecture / overview description",
        category: "documentation",
        pointsAwarded: ARCHITECTURE_DESCRIPTION_MAX_POINTS,
        maxPoints: ARCHITECTURE_DESCRIPTION_MAX_POINTS,
        passed: true,
        evidence: {
          filesChecked: [readmePath],
          found: true,
          details: `Detected architecture description: found heading '${matchedHeading}' in ${readmePath}.`,
        },
      };
    }
  }

  // 2. Check for dedicated ARCHITECTURE documentation file in paths
  if (paths !== undefined) {
    const matchedFile = findFile(paths, ARCHITECTURE_CANDIDATES);
    if (matchedFile) {
      return {
        id: "architecture-description",
        name: "Architecture / overview description",
        category: "documentation",
        pointsAwarded: ARCHITECTURE_DESCRIPTION_MAX_POINTS,
        maxPoints: ARCHITECTURE_DESCRIPTION_MAX_POINTS,
        passed: true,
        evidence: {
          filesChecked: [...ARCHITECTURE_CANDIDATES],
          found: true,
          details: `Found dedicated architecture documentation: ${matchedFile}`,
        },
      };
    }
  }

  // Failed
  return {
    id: "architecture-description",
    name: "Architecture / overview description",
    category: "documentation",
    pointsAwarded: 0,
    maxPoints: ARCHITECTURE_DESCRIPTION_MAX_POINTS,
    passed: false,
    evidence: {
      filesChecked: ["README.md", ...ARCHITECTURE_CANDIDATES],
      found: false,
      details:
        "No architecture or overview documentation found. Checked README for headings like Architecture, Overview, Design, How it works, and repository for ARCHITECTURE.md.",
    },
    remediation: {
      canAutomate: false,
      targetPath: "README.md",
      description:
        "Add an 'Architecture', 'Overview', or 'How it works' section to README.md (or create ARCHITECTURE.md) explaining high-level system design.",
    },
  };
}

/**
 * Checks for the presence of a CONTRIBUTING guidelines file in standard repository locations.
 *
 * Evaluates candidate file names including CONTRIBUTING.md, CONTRIBUTING, etc.
 * at the repository root, under .github/, and under docs/.
 *
 * Awards 3 points on match. On failure, returns remediation instructions.
 *
 * @param pathsOrOptions - Set of lowercased file paths or options container
 * @returns CheckResult for contributing guidelines check
 */
export function checkContributing(
  pathsOrOptions: Set<string> | { paths: Set<string> },
): CheckResult {
  const paths = pathsOrOptions instanceof Set ? pathsOrOptions : pathsOrOptions.paths;
  const matched = findFile(paths, CONTRIBUTING_CANDIDATES);
  const passed = matched !== null;

  return {
    id: "contributing",
    name: "Contributing guidelines",
    category: "documentation",
    pointsAwarded: passed ? CONTRIBUTING_MAX_POINTS : 0,
    maxPoints: CONTRIBUTING_MAX_POINTS,
    passed,
    evidence: {
      filesChecked: [...CONTRIBUTING_CANDIDATES],
      found: passed,
      details: passed
        ? `Found contributing guidelines: ${matched}`
        : "No CONTRIBUTING guidelines found at repository root or standard locations.",
    },
    ...(passed
      ? {}
      : {
          remediation: {
            canAutomate: false,
            targetPath: "CONTRIBUTING.md",
            description:
              "Add a CONTRIBUTING.md file defining setup instructions, contribution workflow, and pull request guidelines.",
          },
        }),
  };
}

export interface DocumentationCheckContext {
  paths: Set<string>;
  readmeContent?: string | null;
}

/**
 * Runs all documentation checks against repository paths and README content.
 *
 * Returns an array of CheckResult objects for:
 * 1. README presence (8 pts)
 * 2. Essential README sections (10 pts)
 * 3. Architecture description (4 pts)
 * 4. Contributing guidelines (3 pts)
 *
 * Total maximum points across all documentation checks is exactly 25 points.
 *
 * @param pathsOrOptions - Path set or context container
 * @param maybeReadmeContent - Optional raw README content when paths set is passed as first argument
 * @returns Array of CheckResult objects for documentation category
 */
export function checkDocumentation(
  pathsOrOptions: Set<string> | DocumentationCheckContext,
  maybeReadmeContent?: string | null,
): CheckResult[] {
  let paths: Set<string>;
  let readmeContent: string | null = null;

  if (pathsOrOptions instanceof Set) {
    paths = pathsOrOptions;
    readmeContent = maybeReadmeContent ?? null;
  } else {
    paths = pathsOrOptions.paths;
    readmeContent = pathsOrOptions.readmeContent ?? null;
  }

  return [
    checkReadmePresence(paths),
    checkReadmeHeadings(readmeContent, paths),
    checkArchitectureDescription(readmeContent, paths),
    checkContributing(paths),
  ];
}

export const runDocumentationChecks = checkDocumentation;
