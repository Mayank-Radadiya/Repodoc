import type {
  CategoryId,
  SampleCheck,
  ProposedFile,
  CategorySummary,
} from "../types/report";

// Fictional repository; the weights follow the product's v1.0 rubric.
export const checks: SampleCheck[] = [
  {
    id: "readme",
    category: "documentation",
    name: "README present",
    passed: true,
    maxPoints: 8,
    path: "README.md",
    evidence: "README.md is present at the repository root.",
    recommendation:
      "The project has a clear starting point for new contributors.",
  },
  {
    id: "readme-headings",
    category: "documentation",
    name: "Installation and usage",
    passed: true,
    maxPoints: 10,
    path: "README.md",
    evidence:
      "Detected Installation and Usage headings in README.md. The check evaluates structure, not word count.",
    recommendation: "Both essential sections are present.",
  },
  {
    id: "overview",
    category: "documentation",
    name: "Project overview",
    passed: true,
    maxPoints: 4,
    path: "README.md",
    evidence:
      "An Overview section explains the CLI's purpose and architecture.",
    recommendation: "Keep the overview aligned with the project as it evolves.",
  },
  {
    id: "contributing",
    category: "documentation",
    name: "Contributing guidelines",
    passed: true,
    maxPoints: 3,
    path: "CONTRIBUTING.md",
    evidence:
      "CONTRIBUTING.md documents the local setup and contribution process.",
    recommendation: "Contribution instructions are available.",
  },
  {
    id: "license",
    category: "hygiene",
    name: "Open-source license",
    passed: true,
    maxPoints: 10,
    path: "LICENSE",
    evidence: "An MIT license is present in this sample repository.",
    recommendation:
      "Keep the existing license. License selection remains the maintainer's decision.",
  },
  {
    id: "gitignore",
    category: "hygiene",
    name: "Language-appropriate .gitignore",
    passed: false,
    maxPoints: 5,
    path: ".gitignore",
    evidence:
      "No .gitignore was found at the repository root. package.json identifies a Node.js project.",
    recommendation:
      "Add a Node.js .gitignore for dependencies, local environment files, and build output.",
  },
  {
    id: "code-of-conduct",
    category: "hygiene",
    name: "Code of conduct",
    passed: true,
    maxPoints: 5,
    path: "CODE_OF_CONDUCT.md",
    evidence: "CODE_OF_CONDUCT.md is present at the repository root.",
    recommendation: "Community participation guidelines are available.",
  },
  {
    id: "ci-workflow",
    category: "testing_ci",
    name: "Automated CI workflow",
    passed: false,
    maxPoints: 15,
    path: ".github/workflows/ci.yml",
    evidence:
      "No .yml or .yaml workflow was found in .github/workflows/. package.json defines a test script and package-lock.json is present.",
    recommendation:
      "Add a GitHub Actions workflow to install dependencies and run the existing tests on pushes and pull requests.",
  },
  {
    id: "tests",
    category: "testing_ci",
    name: "Tests configured",
    passed: true,
    maxPoints: 10,
    path: "package.json",
    evidence:
      "package.json defines a test script. This is a configuration check; the audit does not execute tests.",
    recommendation: "A test entry point is configured.",
  },
  {
    id: "templates",
    category: "community",
    name: "Issue and PR templates",
    passed: true,
    maxPoints: 8,
    path: ".github/ISSUE_TEMPLATE/bug_report.md",
    evidence:
      "An issue template and .github/pull_request_template.md are present.",
    recommendation:
      "Contributors have a structured way to report issues and propose changes.",
  },
  {
    id: "metadata",
    category: "community",
    name: "Description and topics",
    passed: true,
    maxPoints: 7,
    path: "GitHub repository metadata",
    evidence:
      "The sample repository has a description and the topics nodejs, cli, and developer-tools.",
    recommendation: "Project metadata gives visitors useful context.",
  },
  {
    id: "security-policy",
    category: "security",
    name: "Vulnerability reporting policy",
    passed: true,
    maxPoints: 10,
    path: "SECURITY.md",
    evidence: "SECURITY.md describes how to report a vulnerability privately.",
    recommendation: "A vulnerability reporting channel is documented.",
  },
  {
    id: "dependency-updates",
    category: "security",
    name: "Dependency updates configured",
    passed: true,
    maxPoints: 5,
    path: ".github/dependabot.yml",
    evidence: "Dependabot is configured for npm dependency updates.",
    recommendation: "Automated dependency update configuration is present.",
  },
];

export const categoryDefinitions: {
  id: CategoryId;
  name: string;
  shortName: string;
}[] = [
  { id: "documentation", name: "Documentation", shortName: "Documentation" },
  { id: "hygiene", name: "Project hygiene", shortName: "Hygiene" },
  { id: "testing_ci", name: "Testing & CI", shortName: "Testing & CI" },
  { id: "community", name: "Community & metadata", shortName: "Community" },
  { id: "security", name: "Security baseline", shortName: "Security" },
];

export const categories: CategorySummary[] = categoryDefinitions.map(
  (category) => {
    const categoryChecks = checks.filter(
      (check) => check.category === category.id,
    );
    return {
      ...category,
      points: categoryChecks.reduce(
        (sum, check) => sum + (check.passed ? check.maxPoints : 0),
        0,
      ),
      maxPoints: categoryChecks.reduce(
        (sum, check) => sum + check.maxPoints,
        0,
      ),
    };
  },
);

export const sampleScore = categories.reduce(
  (sum, category) => sum + category.points,
  0,
);

export const missingChecks = checks.filter((check) => !check.passed);
export const passedChecks = checks.filter((check) => check.passed);

export const projectedScore =
  sampleScore +
  missingChecks.reduce((sum, check) => sum + check.maxPoints, 0);

export const proposedFiles: ProposedFile[] = [
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
      "permissions:",
      "  contents: read",
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

export const badgeMarkdown =
  "[![Repodoc health](https://img.shields.io/endpoint?url=https://your-repodoc-instance.example/api/badge/owner/repo)](https://your-repodoc-instance.example/report/owner/repo)";
