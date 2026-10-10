import { ShieldCheck, Award, GitPullRequest } from "lucide-react";
import type { AuditMode } from "../types";

export const AUDIT_MODES: AuditMode[] = [
  { id: "audit", label: "100-Pt Audit", Icon: ShieldCheck },
  { id: "badge", label: "Shields Badge", Icon: Award },
  { id: "pr", label: "Atomic PR", Icon: GitPullRequest },
];

export const SAMPLE_REPOS = [
  "github.com/facebook/react",
  "github.com/astral-sh/uv",
  "github.com/shadcn-ui/ui",
  "github.com/sample/atlas-cli",
];

export const TRUST_METRICS = [
  "Single-roundtrip Git tree traversal",
  "Defensible v1.0 Rubric",
  "1-Click Atomic PR via Git Data API",
];
