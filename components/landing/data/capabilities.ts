import {
  FolderTree,
  GitPullRequest,
  Zap,
  Award,
  Scale,
  GitBranch,
} from "lucide-react";
import type { CapabilityItem } from "../types";

export const CAPABILITIES: CapabilityItem[] = [
  {
    icon: FolderTree,
    title: "Single-Call Tree Traversal",
    desc: "Resolves 90%+ repository presence checks in a single recursive tree call (GET /git/trees). Executes in-memory lookups in <1ms without N+1 network churn.",
    badge: "1 API Call",
    iconClass: "bg-[#EAF4FF] text-[#005FD6]",
  },
  {
    icon: GitPullRequest,
    title: "Git Data API Orchestration",
    desc: "Constructs atomic multi-file fixes directly via Git Blobs, Trees, and Commits. Opens a single clean PR from an idempotent branch without checkout churn.",
    badge: "Low-Level API",
    iconClass: "bg-[#EAF4FF] text-[#209BFF]",
  },
  {
    icon: Zap,
    title: "HTTP 304 ETag Resiliency",
    desc: "Leverages conditional requests (If-None-Match). Re-auditing unchanged repositories returns 304 Not Modified, consuming zero GitHub rate-limit quota.",
    badge: "0 Quota Hit",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Award,
    title: "Shields.io Dynamic Endpoint",
    desc: "Serves standard Shields.io endpoint JSON directly (/api/badge/[owner]/[repo]), eliminating fragile serverless SVG/canvas rendering bottlenecks.",
    badge: "Schema v1",
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    icon: Scale,
    title: "Legal-Safe License Prompting",
    desc: "Choosing an open-source license is a legal decision. The engine identifies missing licenses and prompts maintainers for explicit SPDX selection.",
    badge: "SPDX Compliant",
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    icon: GitBranch,
    title: "Idempotent Branch Remediation",
    desc: "All automated remediations target repodoc/health-remediation. Subsequent audits cleanly fast-forward the branch rather than spamming duplicate PRs.",
    badge: "Safe Fast-Forward",
    iconClass: "bg-violet-50 text-violet-600",
  },
];
