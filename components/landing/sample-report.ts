import {
  CategoryId,
  RubricCategoryInfo,
  RubricCheckItem,
  DiffFileItem,
  RepoAuditProfile,
} from "./types";

export const RUBRIC_CATEGORIES: RubricCategoryInfo[] = [
  {
    id: "documentation",
    label: "Documentation",
    maxPoints: 25,
    description: "AST heading tokens, architecture overview, and contributor setup guidelines.",
  },
  {
    id: "hygiene",
    label: "Project Hygiene",
    maxPoints: 20,
    description: "OSI license compliance, language-specific .gitignore, and Code of Conduct.",
  },
  {
    id: "testing_ci",
    label: "Testing & CI/CD",
    maxPoints: 25,
    description: "Automated GitHub Actions workflows and manifest test script configurations.",
  },
  {
    id: "community",
    label: "Community & Metadata",
    maxPoints: 15,
    description: "Issue/PR templates, maintainer triage ergonomics, and GitHub topics.",
  },
  {
    id: "security",
    label: "Security Baseline",
    maxPoints: 15,
    description: "Vulnerability disclosure policy (SECURITY.md) and automated dependency scanning.",
  },
];

const ATLAS_CLI_CHECKS: RubricCheckItem[] = [
  {
    id: "readme",
    name: "README Presence & Structure",
    category: "documentation",
    pointsAwarded: 8,
    maxPoints: 8,
    passed: true,
    evidence: {
      filesChecked: ["README.md"],
      found: true,
      details: "README.md resolved at root via single-roundtrip git tree traversal (SHA: 4fa2b1).",
    },
  },
  {
    id: "readme-headings",
    name: "Essential Heading Tokens",
    category: "documentation",
    pointsAwarded: 10,
    maxPoints: 10,
    passed: true,
    evidence: {
      filesChecked: ["README.md"],
      found: true,
      details: "Detected '## Installation' and '## Quickstart' in AST heading index.",
    },
  },
  {
    id: "contributing",
    name: "Contributing Guidelines",
    category: "documentation",
    pointsAwarded: 3,
    maxPoints: 3,
    passed: true,
    evidence: {
      filesChecked: ["CONTRIBUTING.md"],
      found: true,
      details: "Found CONTRIBUTING.md outlining PR conventions and development setup.",
    },
  },
  {
    id: "license",
    name: "Open-Source OSI License",
    category: "hygiene",
    pointsAwarded: 10,
    maxPoints: 10,
    passed: true,
    evidence: {
      filesChecked: ["LICENSE"],
      found: true,
      details: "Valid MIT License recognized with standard OSI disclaimer blocks.",
    },
  },
  {
    id: "gitignore",
    name: "Language-Appropriate .gitignore",
    category: "hygiene",
    pointsAwarded: 0,
    maxPoints: 5,
    passed: false,
    evidence: {
      filesChecked: [".gitignore"],
      found: false,
      details: "Missing .gitignore file. Identified Node.js project from package.json.",
    },
    remediation: {
      canAutomate: true,
      targetPath: ".gitignore",
      description: "Generate standard Node.js/npm ignore rules (node_modules, .env, build output).",
    },
  },
  {
    id: "code-of-conduct",
    name: "Code of Conduct",
    category: "hygiene",
    pointsAwarded: 5,
    maxPoints: 5,
    passed: true,
    evidence: {
      filesChecked: ["CODE_OF_CONDUCT.md"],
      found: true,
      details: "Contributor Covenant v2.1 detected in root tree.",
    },
  },
  {
    id: "ci-workflow",
    name: "Automated CI/CD Workflow",
    category: "testing_ci",
    pointsAwarded: 0,
    maxPoints: 15,
    passed: false,
    evidence: {
      filesChecked: [".github/workflows/*.yml", ".github/workflows/*.yaml"],
      found: false,
      details: "No automated GitHub Actions workflows found in .github/workflows directory.",
    },
    remediation: {
      canAutomate: true,
      targetPath: ".github/workflows/ci.yml",
      description: "Create standard Node.js CI matrix workflow running on push and PR.",
    },
  },
  {
    id: "test-manifest",
    name: "Test Runner Script Defined",
    category: "testing_ci",
    pointsAwarded: 10,
    maxPoints: 10,
    passed: true,
    evidence: {
      filesChecked: ["package.json"],
      found: true,
      details: "Detected 'scripts.test' field ('vitest run') in package.json manifest.",
    },
  },
  {
    id: "issue-templates",
    name: "Issue & PR Templates",
    category: "community",
    pointsAwarded: 8,
    maxPoints: 8,
    passed: true,
    evidence: {
      filesChecked: [".github/ISSUE_TEMPLATE", ".github/pull_request_template.md"],
      found: true,
      details: "Issue templates detected for bug reports and feature requests.",
    },
  },
  {
    id: "repo-metadata",
    name: "Repository Description & Topics",
    category: "community",
    pointsAwarded: 3,
    maxPoints: 7,
    passed: false,
    evidence: {
      filesChecked: ["repository.meta"],
      found: false,
      details: "Repository has description but zero GitHub topics configured.",
    },
  },
  {
    id: "security-md",
    name: "Security Disclosure Policy",
    category: "security",
    pointsAwarded: 10,
    maxPoints: 10,
    passed: true,
    evidence: {
      filesChecked: ["SECURITY.md", ".github/SECURITY.md"],
      found: true,
      details: "SECURITY.md provides private vulnerability reporting instructions.",
    },
  },
  {
    id: "dependabot",
    name: "Automated Dependency Scanning",
    category: "security",
    pointsAwarded: 5,
    maxPoints: 5,
    passed: true,
    evidence: {
      filesChecked: [".github/dependabot.yml"],
      found: true,
      details: "Dependabot configuration active with weekly npm updates.",
    },
  },
];

const ATLAS_CLI_DIFFS: DiffFileItem[] = [
  {
    id: "gitignore",
    filename: ".gitignore",
    path: ".gitignore",
    action: "create",
    language: "gitignore",
    summary: "Standard Node.js ignore rules for modules, env, and build artifacts",
    diffLines: [
      { type: "header", content: "@@ -0,0 +1,14 @@" },
      { type: "add", content: "+# Dependency directories", newLine: 1 },
      { type: "add", content: "+node_modules/", newLine: 2 },
      { type: "add", content: "+.pnp", newLine: 3 },
      { type: "add", content: "+.pnp.js", newLine: 4 },
      { type: "add", content: "+", newLine: 5 },
      { type: "add", content: "+# Environment variables & secrets", newLine: 6 },
      { type: "add", content: "+.env", newLine: 7 },
      { type: "add", content: "+.env.local", newLine: 8 },
      { type: "add", content: "+*.pem", newLine: 9 },
      { type: "add", content: "+", newLine: 10 },
      { type: "add", content: "+# Production outputs & caches", newLine: 11 },
      { type: "add", content: "+dist/", newLine: 12 },
      { type: "add", content: "+build/", newLine: 13 },
      { type: "add", content: "+.turbo/", newLine: 14 },
    ],
  },
  {
    id: "ci-workflow",
    filename: "ci.yml",
    path: ".github/workflows/ci.yml",
    action: "create",
    language: "yaml",
    summary: "GitHub Actions CI pipeline with Node.js test execution",
    diffLines: [
      { type: "header", content: "@@ -0,0 +1,21 @@" },
      { type: "add", content: "+name: CI", newLine: 1 },
      { type: "add", content: "+on:", newLine: 2 },
      { type: "add", content: "+  push:", newLine: 3 },
      { type: "add", content: "+    branches: [main]", newLine: 4 },
      { type: "add", content: "+  pull_request:", newLine: 5 },
      { type: "add", content: "+    branches: [main]", newLine: 6 },
      { type: "add", content: "+jobs:", newLine: 7 },
      { type: "add", content: "+  test:", newLine: 8 },
      { type: "add", content: "+    runs-on: ubuntu-latest", newLine: 9 },
      { type: "add", content: "+    steps:", newLine: 10 },
      { type: "add", content: "+      - uses: actions/checkout@v4", newLine: 11 },
      { type: "add", content: "+      - uses: actions/setup-node@v4", newLine: 12 },
      { type: "add", content: "+        with:", newLine: 13 },
      { type: "add", content: "+          node-version: 20", newLine: 14 },
      { type: "add", content: "+          cache: 'npm'", newLine: 15 },
      { type: "add", content: "+      - run: npm ci", newLine: 16 },
      { type: "add", content: "+      - run: npm test", newLine: 17 },
      { type: "add", content: "+      - run: npm run lint", newLine: 18 },
    ],
  },
  {
    id: "license",
    filename: "LICENSE",
    path: "LICENSE",
    action: "modify",
    language: "text",
    summary: "Verified OSI MIT license header formatting",
    diffLines: [
      { type: "header", content: "@@ -1,3 +1,3 @@" },
      { type: "context", content: " MIT License" },
      { type: "context", content: "" },
      { type: "context", content: " Copyright (c) 2026 Atlas Core Team" },
    ],
  },
];

export const SAMPLE_REPOS_PROFILES: RepoAuditProfile[] = [
  {
    id: "sample-atlas-cli",
    owner: "sample",
    repo: "atlas-cli",
    fullName: "sample/atlas-cli",
    description: "Modern developer CLI for distributed infrastructure deployment and state validation.",
    projectType: "cli",
    totalScore: 74,
    letterGrade: "C",
    badgeColor: "yellow",
    checksCount: 12,
    passedCount: 9,
    durationMs: 840,
    starsCount: "1.2k",
    forksCount: "148",
    checks: ATLAS_CLI_CHECKS,
    diffFiles: ATLAS_CLI_DIFFS,
  },
  {
    id: "astral-sh-uv",
    owner: "astral-sh",
    repo: "uv",
    fullName: "astral-sh/uv",
    description: "An extremely fast Python package and project manager, written in Rust.",
    projectType: "cli",
    totalScore: 94,
    letterGrade: "A",
    badgeColor: "brightgreen",
    checksCount: 12,
    passedCount: 12,
    durationMs: 620,
    starsCount: "42.8k",
    forksCount: "1.6k",
    checks: ATLAS_CLI_CHECKS.map((c) => ({
      ...c,
      pointsAwarded: c.maxPoints,
      passed: true,
      evidence: {
        ...c.evidence,
        details: `Passed full criteria verification in astral-sh/uv (evaluated via Rust workspace AST).`,
      },
      remediation: undefined,
    })),
    diffFiles: [
      {
        id: "badge",
        filename: "README.md",
        path: "README.md",
        action: "modify",
        language: "markdown",
        summary: "Embed official Repodoc health badge in repository header",
        diffLines: [
          { type: "header", content: "@@ -1,4 +1,5 @@" },
          { type: "context", content: " # uv" },
          { type: "add", content: "+[![Repodoc Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/astral-sh/uv)](https://repodoc.dev/report/astral-sh/uv)", newLine: 2 },
          { type: "context", content: " An extremely fast Python package manager." },
        ],
      },
    ],
  },
  {
    id: "facebook-react",
    owner: "facebook",
    repo: "react",
    fullName: "facebook/react",
    description: "The library for web and native user interfaces.",
    projectType: "library",
    totalScore: 96,
    letterGrade: "A",
    badgeColor: "brightgreen",
    checksCount: 12,
    passedCount: 12,
    durationMs: 910,
    starsCount: "228k",
    forksCount: "46.2k",
    checks: ATLAS_CLI_CHECKS.map((c) => ({
      ...c,
      pointsAwarded: c.maxPoints,
      passed: true,
      evidence: {
        ...c.evidence,
        details: `Passed library-adapted criteria (no app asset penalties applied to core library).`,
      },
      remediation: undefined,
    })),
    diffFiles: [],
  },
  {
    id: "shadcn-ui",
    owner: "shadcn-ui",
    repo: "ui",
    fullName: "shadcn-ui/ui",
    description: "A set of beautifully-designed, accessible components and a code distribution platform.",
    projectType: "library",
    totalScore: 91,
    letterGrade: "A",
    badgeColor: "brightgreen",
    checksCount: 12,
    passedCount: 11,
    durationMs: 730,
    starsCount: "74.5k",
    forksCount: "6.9k",
    checks: ATLAS_CLI_CHECKS.map((c) => ({
      ...c,
      pointsAwarded: c.id === "repo-metadata" ? 4 : c.maxPoints,
      passed: c.id !== "repo-metadata",
    })),
    diffFiles: [],
  },
];

// Backwards compatibility for existing legacy components during incremental rebuild
export interface SampleCheck {
  id: string;
  category: CategoryId;
  name: string;
  passed: boolean;
  maxPoints: number;
  path: string;
  evidence: string;
  recommendation: string;
}

export const checks: SampleCheck[] = ATLAS_CLI_CHECKS.map((c) => ({
  id: c.id,
  category: c.category,
  name: c.name,
  passed: c.passed,
  maxPoints: c.maxPoints,
  path: c.evidence.filesChecked[0] || "",
  evidence: c.evidence.details,
  recommendation: c.remediation?.description || "Looks good.",
}));

export const missingChecks = checks.filter((c) => !c.passed);
export const passedChecks = checks.filter((c) => c.passed);
export const sampleScore = 74;
export const projectedScore = 100;
export const categories = [
  { id: "documentation" as CategoryId, name: "Documentation", shortName: "Docs", points: 22, maxPoints: 25 },
  { id: "hygiene" as CategoryId, name: "Project Hygiene", shortName: "Hygiene", points: 15, maxPoints: 20 },
  { id: "testing_ci" as CategoryId, name: "Testing & CI/CD", shortName: "CI/CD", points: 10, maxPoints: 25 },
  { id: "community" as CategoryId, name: "Community & Metadata", shortName: "Community", points: 12, maxPoints: 15 },
  { id: "security" as CategoryId, name: "Security Baseline", shortName: "Security", points: 15, maxPoints: 15 },
];
export const badgeMarkdown =
  "[![Repodoc health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/sample/atlas-cli)](https://repodoc.dev/report/sample/atlas-cli)";

export const proposedFiles = [
  {
    path: ".gitignore",
    lines: [
      "node_modules/",
      ".env",
      ".env.*",
      "!.env.example",
      "dist/",
      "coverage/",
    ],
  },
  {
    path: ".github/workflows/ci.yml",
    lines: [
      "name: CI",
      "on: [push, pull_request]",
      "",
      "jobs:",
      "  test:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 22",
      "          cache: npm",
      "      - run: npm ci",
      "      - run: npm test",
    ],
  },
];

