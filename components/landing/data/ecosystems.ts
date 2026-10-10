import type { Ecosystem } from "../types";

export const ECOSYSTEMS: Ecosystem[] = [
  {
    name: "TypeScript / Node",
    manifest: "package.json",
    badge: "TS / JS",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    name: "Python",
    manifest: "pyproject.toml",
    badge: "Python",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    name: "Rust",
    manifest: "Cargo.toml",
    badge: "Rust",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    name: "Go",
    manifest: "go.mod",
    badge: "Go",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    name: "Java / Gradle",
    manifest: "pom.xml",
    badge: "Java",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    name: "Container / Cloud",
    manifest: "Dockerfile",
    badge: "OCI",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];
