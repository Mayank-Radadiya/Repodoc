export type CategoryId =
  | "documentation"
  | "hygiene"
  | "testing_ci"
  | "community"
  | "security";

export interface RubricCategoryInfo {
  id: CategoryId;
  label: string;
  maxPoints: number;
  description: string;
}

export interface RubricCheckItem {
  id: string;
  name: string;
  category: CategoryId;
  pointsAwarded: number;
  maxPoints: number;
  passed: boolean;
  evidence: {
    filesChecked: string[];
    found: boolean;
    details: string;
  };
  remediation?: {
    canAutomate: boolean;
    targetPath: string;
    description: string;
    requiresUserInput?: "license_selection";
  };
}

export interface DiffFileItem {
  id: string;
  filename: string;
  path: string;
  action: "create" | "modify";
  language: string;
  summary: string;
  diffLines: {
    type: "add" | "remove" | "context" | "header";
    content: string;
    oldLine?: number;
    newLine?: number;
  }[];
}

export interface RepoAuditProfile {
  id: string;
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  projectType: "library" | "cli" | "application";
  totalScore: number;
  letterGrade: "A" | "B" | "C" | "D" | "F";
  badgeColor: "brightgreen" | "green" | "yellow" | "orange" | "red";
  checksCount: number;
  passedCount: number;
  durationMs: number;
  starsCount: string;
  forksCount: string;
  checks: RubricCheckItem[];
  diffFiles: DiffFileItem[];
}
