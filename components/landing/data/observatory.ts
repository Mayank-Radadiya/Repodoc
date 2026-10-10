import type { ObservatoryCategory } from "../types/report";

export const OBSERVATORY_CATEGORIES: ObservatoryCategory[] = [
  {
    name: "Documentation",
    score: 25,
    max: 25,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    name: "Hygiene",
    score: 15,
    max: 20,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    name: "Testing & CI",
    score: 10,
    max: 25,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    name: "Community",
    score: 15,
    max: 15,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    name: "Security",
    score: 15,
    max: 15,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
];
