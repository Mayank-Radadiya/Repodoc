import { FolderTree, ScanSearch, GitPullRequest } from "lucide-react";
import type { StepItem } from "../types";

export const STEPS: StepItem[] = [
  {
    id: "traverse",
    stepNumber: "01",
    stepEyebrow: "Reconnaissance",
    Icon: FolderTree,
    title: "Traverse Tree in 1 Call",
    desc: "Single-call recursive Git tree traversal resolves full repo structure in <120ms without local checkouts.",
    badge: "GET /git/trees",
    method: "GET",
    endpoint: "GET /repos/{owner}/{repo}/git/trees/main?recursive=1",
    latencyBenchmark: "< 120ms execution",
    metricValue: "1 Roundtrip",
    metricLabel: "Single call maps entire tree vs. 40+ sequential REST requests",
    iconClass: "bg-[#D6EAFF] text-[#005FD6] border-[#A9D3FF]",
    highlights: [
      "Single HTTP roundtrip eliminates GitHub REST crawler rate limits",
      "Parses 1,000+ files and subtrees in memory under 15ms",
      "Extracts file mode (100644), blob SHAs, and path offsets in one pass",
    ],
    payloadSummary: "1,482 objects mapped in 84ms",
  },
  {
    id: "evaluate",
    stepNumber: "02",
    stepEyebrow: "Defensible Audit",
    Icon: ScanSearch,
    title: "Defensible Rubric Audit",
    desc: "AST heading parsing & manifest checks across 5 core categories with 0 vanity metrics.",
    badge: "100-pt Rubric",
    method: "AUDIT",
    endpoint: "ENGINE // ast-evaluator --rubric=v1.0-strict",
    latencyBenchmark: "0.8ms AST evaluation",
    metricValue: "100-Point Score",
    metricLabel: "Transparent rubric with line-level AST syntax evidence",
    iconClass: "bg-sky-100 text-sky-700 border-sky-200",
    highlights: [
      "Markdown AST parser validates README headings, syntax, and setup sections",
      "Validates SPDX license identifiers, CI matrix, and security policies",
      "Deterministic score weighting generates provable, defensible audit reports",
    ],
    payloadSummary: "12 checks verified in 0.8ms",
  },
  {
    id: "remediate",
    stepNumber: "03",
    stepEyebrow: "Atomic Assembly",
    Icon: GitPullRequest,
    title: "1-Click Atomic PR",
    desc: "Git Data API commits missing hygiene files in one reviewable PR with zero checkout churn.",
    badge: "Atomic Commit",
    method: "POST",
    endpoint: "POST /git/blobs → /git/trees → /git/commits → /git/refs",
    latencyBenchmark: "1 atomic commit",
    metricValue: "0 Conflicts",
    metricLabel: "Idempotent branch created without local clone or git churn",
    iconClass: "bg-emerald-100 text-emerald-600 border-emerald-200",
    highlights: [
      "Synthesizes custom templates for missing .gitignore, LICENSE, and CI workflows",
      "Assembles new Git tree SHA directly referencing base commit parent",
      "Pushes atomic commit to repodoc/health-remediation with a reviewable PR",
    ],
    payloadSummary: "2 files committed · +48 lines",
  },
];

export interface GitTreeMockNode {
  path: string;
  name: string;
  type: "tree" | "blob";
  mode: string;
  sha: string;
  size?: number;
  status: "ok" | "missing" | "flagged";
  statusText: string;
  depth: number;
}

export const MOCK_TREE_NODES: GitTreeMockNode[] = [
  {
    path: ".github",
    name: ".github",
    type: "tree",
    mode: "040000",
    sha: "a1c49e29f...",
    status: "ok",
    statusText: "Directory mapped",
    depth: 0,
  },
  {
    path: ".github/workflows/ci.yml",
    name: "workflows/ci.yml",
    type: "blob",
    mode: "100644",
    sha: "000000000...",
    status: "missing",
    statusText: "Missing CI configuration (-10 pts)",
    depth: 1,
  },
  {
    path: ".gitignore",
    name: ".gitignore",
    type: "blob",
    mode: "100644",
    sha: "000000000...",
    status: "missing",
    statusText: "Missing .gitignore (-5 pts)",
    depth: 0,
  },
  {
    path: "LICENSE",
    name: "LICENSE",
    type: "blob",
    mode: "100644",
    sha: "e69de29bb...",
    size: 11357,
    status: "ok",
    statusText: "SPDX Apache-2.0 verified (+20 pts)",
    depth: 0,
  },
  {
    path: "README.md",
    name: "README.md",
    type: "blob",
    mode: "100644",
    sha: "3bf81a954...",
    size: 4210,
    status: "ok",
    statusText: "AST parsed in 0.4ms (+20 pts)",
    depth: 0,
  },
  {
    path: "package.json",
    name: "package.json",
    type: "blob",
    mode: "100644",
    sha: "9b78e3678...",
    size: 1341,
    status: "ok",
    statusText: "Manifest verified (Next.js 16) (+15 pts)",
    depth: 0,
  },
  {
    path: "src",
    name: "src",
    type: "tree",
    mode: "040000",
    sha: "7d4f9b231...",
    status: "ok",
    statusText: "Subtree mapped (38 files)",
    depth: 0,
  },
];

export interface RubricCategoryMock {
  name: string;
  weight: number;
  score: number;
  iconColor: string;
  checksSummary: string;
}

export const MOCK_RUBRIC_CATEGORIES: RubricCategoryMock[] = [
  {
    name: "Repository Hygiene",
    weight: 20,
    score: 15,
    iconColor: "text-amber-500",
    checksSummary: "Missing .gitignore (-5 pts)",
  },
  {
    name: "Documentation",
    weight: 20,
    score: 20,
    iconColor: "text-emerald-500",
    checksSummary: "All AST headings verified (20/20)",
  },
  {
    name: "Community Standards",
    weight: 20,
    score: 15,
    iconColor: "text-blue-500",
    checksSummary: "Missing PR template (-5 pts)",
  },
  {
    name: "Security Posture",
    weight: 20,
    score: 20,
    iconColor: "text-emerald-500",
    checksSummary: "SECURITY.md policy intact (20/20)",
  },
  {
    name: "Testing & CI",
    weight: 20,
    score: 10,
    iconColor: "text-rose-500",
    checksSummary: "No CI workflow file detected (-10 pts)",
  },
];

