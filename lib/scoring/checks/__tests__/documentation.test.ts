// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { CheckResult } from "@/lib/types";
import { buildPathSet } from "@/lib/scoring/utils";
import {
  checkReadmePresence,
  checkReadmeHeadings,
  checkArchitectureDescription,
  checkContributing,
  checkDocumentation,
  extractMarkdownHeadings,
  README_PRESENCE_MAX_POINTS,
  README_HEADINGS_MAX_POINTS,
  ARCHITECTURE_DESCRIPTION_MAX_POINTS,
  CONTRIBUTING_MAX_POINTS,
  DOCUMENTATION_MAX_POINTS,
  README_CANDIDATES,
  ARCHITECTURE_CANDIDATES,
  CONTRIBUTING_CANDIDATES,
} from "../documentation";

describe("Documentation Checks", () => {
  describe("extractMarkdownHeadings", () => {
    it("extracts ATX headings with various levels", () => {
      const content = `
# Title
## Installation
### Getting Started
#### Usage Details
##### Sub section
###### Deep section
`;
      const headings = extractMarkdownHeadings(content);
      expect(headings).toEqual([
        "Title",
        "Installation",
        "Getting Started",
        "Usage Details",
        "Sub section",
        "Deep section",
      ]);
    });

    it("ignores comments inside code blocks", () => {
      const content = `
# Real Heading

\`\`\`bash
# Not a heading (bash comment)
npm install my-package
\`\`\`

~~~python
# Python comment
import sys
~~~

## Usage
Run the app.
`;
      const headings = extractMarkdownHeadings(content);
      expect(headings).toEqual(["Real Heading", "Usage"]);
      expect(headings).not.toContain("Not a heading (bash comment)");
      expect(headings).not.toContain("Python comment");
    });

    it("extracts Setext headings", () => {
      const content = `
Project Title
=============

Installation
------------
`;
      const headings = extractMarkdownHeadings(content);
      expect(headings).toEqual(["Project Title", "Installation"]);
    });

    it("extracts HTML headings", () => {
      const content = `
<h1>Overview</h1>
<p>Some text</p>
<h2>Quickstart</h2>
`;
      const headings = extractMarkdownHeadings(content);
      expect(headings).toEqual(["Overview", "Quickstart"]);
    });

    it("cleans links, bold, italics, and inline code in headings", () => {
      const content = `
## [Installation Guide](https://example.com)
## **Advanced Setup**
## *Basic Usage*
## \`CLI\` Commands
## [Ref Link][1]
`;
      const headings = extractMarkdownHeadings(content);
      expect(headings).toEqual([
        "Installation Guide",
        "Advanced Setup",
        "Basic Usage",
        "CLI Commands",
        "Ref Link",
      ]);
    });

    it("returns empty array for empty, whitespace, or non-string input", () => {
      expect(extractMarkdownHeadings("")).toEqual([]);
      expect(extractMarkdownHeadings("   \n\t  ")).toEqual([]);
      expect(extractMarkdownHeadings(null)).toEqual([]);
      expect(extractMarkdownHeadings(undefined)).toEqual([]);
    });
  });

  describe("checkReadmePresence", () => {
    it("passes with full 8 points when standard README.md exists", () => {
      const paths = new Set(["readme.md"]);
      const result = checkReadmePresence(paths);

      expect(result).toEqual<CheckResult>({
        id: "readme-presence",
        name: "README file",
        category: "documentation",
        pointsAwarded: 8,
        maxPoints: 8,
        passed: true,
        evidence: {
          filesChecked: [...README_CANDIDATES],
          found: true,
          details: "Found README file: README.md",
        },
      });
      expect(result.remediation).toBeUndefined();
    });

    it("passes when README, README.rst, or README.txt is present", () => {
      expect(checkReadmePresence(new Set(["readme"])).passed).toBe(true);
      expect(checkReadmePresence(new Set(["readme"])).pointsAwarded).toBe(8);

      expect(checkReadmePresence(new Set(["readme.rst"])).passed).toBe(true);
      expect(checkReadmePresence(new Set(["readme.txt"])).passed).toBe(true);
      expect(checkReadmePresence(new Set(["readme.markdown"])).passed).toBe(true);
      expect(checkReadmePresence(new Set(["readme.adoc"])).passed).toBe(true);
    });

    it("passes when README is located in .github/ or docs/", () => {
      const githubResult = checkReadmePresence(new Set([".github/readme.md"]));
      expect(githubResult.passed).toBe(true);
      expect(githubResult.pointsAwarded).toBe(8);
      expect(githubResult.evidence.details).toContain(".github/README.md");

      const docsResult = checkReadmePresence(new Set(["docs/readme.md"]));
      expect(docsResult.passed).toBe(true);
      expect(docsResult.pointsAwarded).toBe(8);
      expect(docsResult.evidence.details).toContain("docs/README.md");
    });

    it("accepts options object syntax { paths }", () => {
      const result = checkReadmePresence({ paths: new Set(["readme.md"]) });
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(8);
    });

    it("fails with 0 points and remediation when README is missing", () => {
      const paths = new Set(["license", ".gitignore"]);
      const result = checkReadmePresence(paths);

      expect(result.id).toBe("readme-presence");
      expect(result.name).toBe("README file");
      expect(result.category).toBe("documentation");
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(8);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.details).toContain("No README file was found");
      expect(result.remediation).toEqual({
        canAutomate: false,
        targetPath: "README.md",
        description:
          "Create a README.md file at the repository root describing the project's purpose, setup, and usage.",
      });
    });

    it("fails cleanly when path set is empty", () => {
      const result = checkReadmePresence(new Set());
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.remediation?.targetPath).toBe("README.md");
    });
  });

  describe("checkReadmeHeadings", () => {
    it("passes with full 10 points when both Installation and Usage headings are present", () => {
      const content = `
# Repodoc
A tool for repository health.

## Installation
\`\`\`bash
npm install repodoc
\`\`\`

## Usage
\`\`\`bash
repodoc audit owner/repo
\`\`\`
`;
      const result = checkReadmeHeadings(content);

      expect(result).toEqual<CheckResult>({
        id: "readme-headings",
        name: "Essential README sections",
        category: "documentation",
        pointsAwarded: 10,
        maxPoints: 10,
        passed: true,
        evidence: {
          filesChecked: ["README.md"],
          found: true,
          details:
            "Detected essential documentation headings: found Installation/Setup ('Installation') and Usage/Quickstart ('Usage') in README.md.",
        },
      });
      expect(result.remediation).toBeUndefined();
    });

    it("passes when synonyms Setup and Quickstart are used", () => {
      const content = `
# Project

## Setup
Follow these steps.

## Quickstart
Run this command.
`;
      const result = checkReadmeHeadings(content);
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.evidence.details).toContain("Setup");
      expect(result.evidence.details).toContain("Quickstart");
    });

    it("passes case-insensitively with headings like Quick Start, Setup, and How to use", () => {
      const content = `
# Title

## SETUP INSTRUCTIONS
Do this first.

## QUICK START
Here is how to run it.
`;
      const result = checkReadmeHeadings(content);
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);

      const content2 = `
# Title

## HOW TO INSTALL
Step 1.

## HOW TO USE
Step 2.
`;
      const result2 = checkReadmeHeadings(content2);
      expect(result2.passed).toBe(true);
      expect(result2.pointsAwarded).toBe(10);
    });

    it("passes when combined into a single heading like 'Installation and Usage'", () => {
      const content = `
# Title

## Installation and Usage
Here is how to install and use it.
`;
      const result = checkReadmeHeadings(content);
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
    });

    it("fails with 0 points when Installation is present but Usage/Quickstart is missing", () => {
      const content = `
# Title

## Installation
Run npm install.

## License
MIT.
`;
      const result = checkReadmeHeadings(content);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(10);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.details).toContain("missing Usage/Quickstart");
      expect(result.remediation).toEqual({
        canAutomate: false,
        targetPath: "README.md",
        description:
          "Add clear 'Installation' (or 'Setup') and 'Usage' (or 'Quickstart') sections to README.md to help users get started.",
      });
    });

    it("fails with 0 points when Usage is present but Installation/Setup is missing", () => {
      const content = `
# Title

## Usage
Run npm start.

## Features
Many great features.
`;
      const result = checkReadmeHeadings(content);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.evidence.details).toContain("missing Installation/Setup");
    });

    it("fails with 0 points when neither heading is present", () => {
      const content = `
# Title
Just a description without setup or usage.

## Features
- Fast
- Reliable
`;
      const result = checkReadmeHeadings(content);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.evidence.details).toContain("neither Installation/Setup nor Usage/Quickstart");
    });

    it("fails with 0 points when README content is empty or null or undefined", () => {
      const emptyResult = checkReadmeHeadings("");
      expect(emptyResult.passed).toBe(false);
      expect(emptyResult.pointsAwarded).toBe(0);
      expect(emptyResult.evidence.details).toContain("empty or not provided");

      const nullResult = checkReadmeHeadings(null);
      expect(nullResult.passed).toBe(false);
      expect(nullResult.pointsAwarded).toBe(0);

      const undefinedResult = checkReadmeHeadings(undefined);
      expect(undefinedResult.passed).toBe(false);
      expect(undefinedResult.pointsAwarded).toBe(0);
    });

    it("fails when paths is provided and repository has no README", () => {
      const paths = new Set(["license", "package.json"]);
      const result = checkReadmeHeadings("## Installation\n## Usage", paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.evidence.details).toContain("README file was not found");
    });

    it("supports flexible argument ordering and options object syntax", () => {
      const content = "## Installation\n## Usage";
      const paths = new Set(["readme.md"]);

      // (paths, content)
      const res1 = checkReadmeHeadings(paths, content);
      expect(res1.passed).toBe(true);

      // (content, paths)
      const res2 = checkReadmeHeadings(content, paths);
      expect(res2.passed).toBe(true);

      // ({ readmeContent, paths })
      const res3 = checkReadmeHeadings({ readmeContent: content, paths });
      expect(res3.passed).toBe(true);
    });
  });

  describe("checkArchitectureDescription", () => {
    it("passes with full 4 points when Architecture heading exists in README", () => {
      const content = `
# Project

## Architecture
This project uses a layered architecture.
`;
      const result = checkArchitectureDescription(content);

      expect(result).toEqual<CheckResult>({
        id: "architecture-description",
        name: "Architecture / overview description",
        category: "documentation",
        pointsAwarded: 4,
        maxPoints: 4,
        passed: true,
        evidence: {
          filesChecked: ["README.md"],
          found: true,
          details:
            "Detected architecture description: found heading 'Architecture' in README.md.",
        },
      });
      expect(result.remediation).toBeUndefined();
    });

    it("passes when synonyms Overview, Design, or 'How it works' are used", () => {
      const overviewRes = checkArchitectureDescription("## Overview\nProject overview.");
      expect(overviewRes.passed).toBe(true);
      expect(overviewRes.pointsAwarded).toBe(4);

      const designRes = checkArchitectureDescription("## System Design\nDesign details.");
      expect(designRes.passed).toBe(true);
      expect(designRes.pointsAwarded).toBe(4);

      const howItWorksRes = checkArchitectureDescription("## How It Works\nWorkflow.");
      expect(howItWorksRes.passed).toBe(true);
      expect(howItWorksRes.pointsAwarded).toBe(4);
    });

    it("passes when dedicated ARCHITECTURE.md file exists in paths", () => {
      const paths = new Set(["architecture.md", "readme.md"]);
      // README has no architecture heading
      const content = "## Installation\n## Usage";
      const result = checkArchitectureDescription(content, paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
      expect(result.evidence.details).toContain("ARCHITECTURE.md");
    });

    it("passes when ARCHITECTURE file is in docs/ or .github/", () => {
      const docsPaths = new Set(["docs/architecture.md"]);
      const result = checkArchitectureDescription(null, docsPaths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
      expect(result.evidence.details).toMatch(/docs\/architecture\.md/i);
    });

    it("fails with 0 points and remediation when neither heading nor file exists", () => {
      const paths = new Set(["readme.md", "license"]);
      const content = "## Installation\n## Usage";
      const result = checkArchitectureDescription(content, paths);

      expect(result.id).toBe("architecture-description");
      expect(result.name).toBe("Architecture / overview description");
      expect(result.category).toBe("documentation");
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(4);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.filesChecked).toEqual(["README.md", ...ARCHITECTURE_CANDIDATES]);
      expect(result.evidence.details).toContain("No architecture or overview documentation found");
      expect(result.remediation).toEqual({
        canAutomate: false,
        targetPath: "README.md",
        description:
          "Add an 'Architecture', 'Overview', or 'How it works' section to README.md (or create ARCHITECTURE.md) explaining high-level system design.",
      });
    });

    it("fails cleanly on empty paths and empty README", () => {
      const result = checkArchitectureDescription(null, new Set());
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("supports flexible argument ordering and options object syntax", () => {
      const content = "## Architecture\nDetails";
      const paths = new Set(["readme.md"]);

      expect(checkArchitectureDescription(paths, content).passed).toBe(true);
      expect(checkArchitectureDescription({ readmeContent: content, paths }).passed).toBe(true);
    });
  });

  describe("checkContributing", () => {
    it("passes with full 3 points when CONTRIBUTING.md exists at root", () => {
      const paths = new Set(["contributing.md"]);
      const result = checkContributing(paths);

      expect(result).toEqual<CheckResult>({
        id: "contributing",
        name: "Contributing guidelines",
        category: "documentation",
        pointsAwarded: 3,
        maxPoints: 3,
        passed: true,
        evidence: {
          filesChecked: [...CONTRIBUTING_CANDIDATES],
          found: true,
          details: "Found contributing guidelines: CONTRIBUTING.md",
        },
      });
      expect(result.remediation).toBeUndefined();
    });

    it("passes when CONTRIBUTING file has alternative extensions or no extension", () => {
      expect(checkContributing(new Set(["contributing"])).passed).toBe(true);
      expect(checkContributing(new Set(["contributing.txt"])).passed).toBe(true);
      expect(checkContributing(new Set(["contributing.rst"])).passed).toBe(true);
    });

    it("passes when CONTRIBUTING is nested under .github/ or docs/", () => {
      const githubRes = checkContributing(new Set([".github/contributing.md"]));
      expect(githubRes.passed).toBe(true);
      expect(githubRes.pointsAwarded).toBe(3);
      expect(githubRes.evidence.details).toContain(".github/CONTRIBUTING.md");

      const docsRes = checkContributing(new Set(["docs/contributing.md"]));
      expect(docsRes.passed).toBe(true);
      expect(docsRes.pointsAwarded).toBe(3);
      expect(docsRes.evidence.details).toContain("docs/CONTRIBUTING.md");
    });

    it("accepts options object syntax { paths }", () => {
      const result = checkContributing({ paths: new Set(["contributing.md"]) });
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(3);
    });

    it("fails with 0 points and remediation when CONTRIBUTING is missing", () => {
      const paths = new Set(["readme.md", "license"]);
      const result = checkContributing(paths);

      expect(result.id).toBe("contributing");
      expect(result.name).toBe("Contributing guidelines");
      expect(result.category).toBe("documentation");
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(3);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.details).toContain("No CONTRIBUTING guidelines found");
      expect(result.remediation).toEqual({
        canAutomate: false,
        targetPath: "CONTRIBUTING.md",
        description:
          "Add a CONTRIBUTING.md file defining setup instructions, contribution workflow, and pull request guidelines.",
      });
    });

    it("fails cleanly when path set is empty", () => {
      const result = checkContributing(new Set());
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });
  });

  describe("checkDocumentation (Aggregator)", () => {
    it("returns all four documentation checks awarding exactly 25 points when all criteria are met", () => {
      const tree = [
        { path: "README.md", mode: "100644" as const, type: "blob" as const, sha: "sha-1" },
        { path: "CONTRIBUTING.md", mode: "100644" as const, type: "blob" as const, sha: "sha-2" },
      ];
      const paths = buildPathSet(tree);
      const readmeContent = `
# Repodoc

## Architecture
How repodoc works.

## Installation
npm install repodoc

## Usage
repodoc audit
`;
      const results = checkDocumentation({ paths, readmeContent });

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.id)).toEqual([
        "readme-presence",
        "readme-headings",
        "architecture-description",
        "contributing",
      ]);

      const totalAwarded = results.reduce((acc, r) => acc + r.pointsAwarded, 0);
      const totalMax = results.reduce((acc, r) => acc + r.maxPoints, 0);

      expect(totalAwarded).toBe(25);
      expect(totalMax).toBe(DOCUMENTATION_MAX_POINTS);
      expect(results.every((r) => r.passed)).toBe(true);
      expect(results.every((r) => r.category === "documentation")).toBe(true);
    });

    it("awards 0 points and provides remediation for each when repository is empty", () => {
      const paths = buildPathSet([]);
      const results = checkDocumentation({ paths });

      expect(results).toHaveLength(4);
      const totalAwarded = results.reduce((acc, r) => acc + r.pointsAwarded, 0);
      expect(totalAwarded).toBe(0);
      expect(results.every((r) => !r.passed)).toBe(true);
      expect(results.every((r) => r.remediation !== undefined)).toBe(true);
    });

    it("handles partial documentation scores accurately (e.g. README present (8) + Contributing (3) = 11 pts)", () => {
      const paths = buildPathSet([
        { path: "README.md", mode: "100644" as const, type: "blob" as const, sha: "sha-1" },
        { path: "CONTRIBUTING.md", mode: "100644" as const, type: "blob" as const, sha: "sha-2" },
      ]);
      // README with no relevant headings
      const readmeContent = "# Project\nJust a bare title";
      const results = checkDocumentation(paths, readmeContent);

      expect(results).toHaveLength(4);
      const [readmeRes, headingsRes, archRes, contribRes] = results;

      expect(readmeRes.passed).toBe(true);
      expect(readmeRes.pointsAwarded).toBe(8);

      expect(headingsRes.passed).toBe(false);
      expect(headingsRes.pointsAwarded).toBe(0);

      expect(archRes.passed).toBe(false);
      expect(archRes.pointsAwarded).toBe(0);

      expect(contribRes.passed).toBe(true);
      expect(contribRes.pointsAwarded).toBe(3);

      const totalAwarded = results.reduce((acc, r) => acc + r.pointsAwarded, 0);
      expect(totalAwarded).toBe(11);
    });

    it("never exceeds 25 total points even if extra matching paths exist", () => {
      const paths = buildPathSet([
        { path: "README.md", mode: "100644" as const, type: "blob" as const, sha: "sha-1" },
        { path: "README.txt", mode: "100644" as const, type: "blob" as const, sha: "sha-2" },
        { path: "ARCHITECTURE.md", mode: "100644" as const, type: "blob" as const, sha: "sha-3" },
        { path: "docs/ARCHITECTURE.md", mode: "100644" as const, type: "blob" as const, sha: "sha-4" },
        { path: "CONTRIBUTING.md", mode: "100644" as const, type: "blob" as const, sha: "sha-5" },
        { path: ".github/CONTRIBUTING.md", mode: "100644" as const, type: "blob" as const, sha: "sha-6" },
      ]);
      const readmeContent = `
## Installation
npm i
## Usage
npm start
## Overview
overview
`;
      const results = checkDocumentation(paths, readmeContent);
      const totalAwarded = results.reduce((acc, r) => acc + r.pointsAwarded, 0);
      expect(totalAwarded).toBeLessThanOrEqual(DOCUMENTATION_MAX_POINTS);
      expect(totalAwarded).toBe(25);
    });

    it("produces deterministic and consistent results on repeated calls", () => {
      const paths = buildPathSet([
        { path: "README.md", mode: "100644" as const, type: "blob" as const, sha: "sha-1" },
        { path: "CONTRIBUTING.md", mode: "100644" as const, type: "blob" as const, sha: "sha-2" },
      ]);
      const readmeContent = "## Setup\n## Quickstart\n## Design";

      const firstRun = checkDocumentation(paths, readmeContent);
      const secondRun = checkDocumentation(paths, readmeContent);

      expect(firstRun).toEqual(secondRun);
    });
  });

  describe("Constants and Rubric Point Values", () => {
    it("ensures individual check max points match the 25-point rubric", () => {
      expect(README_PRESENCE_MAX_POINTS).toBe(8);
      expect(README_HEADINGS_MAX_POINTS).toBe(10);
      expect(ARCHITECTURE_DESCRIPTION_MAX_POINTS).toBe(4);
      expect(CONTRIBUTING_MAX_POINTS).toBe(3);
      expect(
        README_PRESENCE_MAX_POINTS +
          README_HEADINGS_MAX_POINTS +
          ARCHITECTURE_DESCRIPTION_MAX_POINTS +
          CONTRIBUTING_MAX_POINTS,
      ).toBe(DOCUMENTATION_MAX_POINTS);
      expect(DOCUMENTATION_MAX_POINTS).toBe(25);
    });
  });
});
