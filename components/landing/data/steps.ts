import { FolderTree, ScanSearch, GitPullRequest } from "lucide-react";
import type { StepItem } from "../types";

export const STEPS: StepItem[] = [
  {
    Icon: FolderTree,
    title: "Traverse Tree in 1 Call",
    desc: "Single-call recursive Git tree traversal resolves structure in <1ms",
    badge: "GET /git/trees",
    iconClass: "bg-[#D6EAFF] text-[#005FD6] border-[#A9D3FF]",
  },
  {
    Icon: ScanSearch,
    title: "Defensible Rubric Audit",
    desc: "AST heading parsing & manifest checks across 5 core categories",
    badge: "100-pt Rubric",
    iconClass: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    Icon: GitPullRequest,
    title: "1-Click Atomic PR",
    desc: "Git Data API commits missing hygiene files in one reviewable PR",
    badge: "Atomic Commit",
    iconClass: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
];
