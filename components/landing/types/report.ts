import type { CategoryId } from "@/src/lib/types";

export type { CategoryId } from "@/src/lib/types";

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

export interface ProposedFile {
  path: string;
  lines: string[];
}

export interface ObservatoryCategory {
  name: string;
  score: number;
  max: number;
  color: string;
}

export interface CategorySummary {
  id: CategoryId;
  name: string;
  shortName: string;
  points: number;
  maxPoints: number;
}
