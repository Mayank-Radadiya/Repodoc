import type { RecentAudit } from "../types";

export const RUBRIC_WEIGHTS = [
  {
    name: "Documentation (AST Headings)",
    points: 25,
    color: "bg-blue-500",
    text: "text-blue-600",
  },
  {
    name: "Testing & Automated CI",
    points: 25,
    color: "bg-emerald-500",
    text: "text-emerald-600",
  },
  {
    name: "Project Hygiene & License",
    points: 20,
    color: "bg-amber-500",
    text: "text-amber-600",
  },
  {
    name: "Community & Security Baseline",
    points: 30,
    color: "bg-purple-500",
    text: "text-purple-600",
  },
];

export const RECENT_AUDITS: RecentAudit[] = [
  {
    repo: "facebook/react",
    score: "96/100",
    time: "2m ago",
    status: "verified",
    note: "Clean AST headings, valid LICENSE",
  },
  {
    repo: "astral-sh/uv",
    score: "92/100",
    time: "14m ago",
    status: "verified",
    note: "Cargo manifest detected (Rust CLI)",
  },
  {
    repo: "sample/atlas-cli",
    score: "80/100",
    time: "24m ago",
    status: "fix_ready",
    note: "2 hygiene files ready to commit",
  },
  {
    repo: "vercel/next.js",
    score: "95/100",
    time: "1h ago",
    status: "verified",
    note: "Complete monorepo workflow suite",
  },
];
