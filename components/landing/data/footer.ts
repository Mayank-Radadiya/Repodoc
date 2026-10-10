import type { FooterLink } from "../types";

export const PRODUCT_LINKS: FooterLink[] = [
  { label: "Interactive Observatory", href: "#observatory" },
  { label: "Scoring Rubric v1.0", href: "#rubric" },
  { label: "Platform Bento", href: "#features" },
  { label: "Fix Playground", href: "#fix-playground" },
];

export const RESOURCE_LINKS: FooterLink[] = [
  {
    label: "GitHub Repository",
    href: "https://github.com/Mayank-Radadiya/Repodoc",
  },
  {
    label: "Shields.io Documentation",
    href: "https://shields.io/badges/endpoint-badge",
  },
  { label: "SPDX License List", href: "https://spdx.org/licenses/" },
];

export const FOOTER_COPY = {
  tagline:
    "The defensible repository governance platform. 100-point audits, transparent AST evidence, dynamic Shields.io badges, and 1-click atomic PR remediation.",
  standardBadge: "Rubric v1.0 Standard",
  copyright:
    "© 2026 Repodoc. Built for engineers who care about defensible standards.",
  githubUrl: "https://github.com/Mayank-Radadiya/Repodoc",
};
