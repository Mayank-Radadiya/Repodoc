/**
 * Single source of truth for site-wide branding and SEO metadata.
 * Consumed by app/layout.tsx and app/page.tsx so copy can never drift
 * between the two files (it previously did — two different descriptions).
 */

/** Canonical public origin. Override per environment via NEXT_PUBLIC_SITE_URL. */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://repodoc.dev";

export const site = {
  name: "Repodoc",
  title: "Repodoc — Repository Intelligence & Automated Health Remediation",
  description:
    "Generate a 100-point repository health audit with defensible evidence, dynamic shields.io badge, and 1-click atomic PR remediation in a single commit.",
  keywords: [
    "repository audit",
    "code health",
    "shields.io badge",
    "GitHub automation",
    "repository intelligence",
    "defensible rubric",
    "atomic pull request",
    "git data api",
    "open source hygiene",
  ],
  /** BCP-47 locale, formatted for Open Graph (underscore, not hyphen). */
  locale: "en_US",
} as const;

/** Structured data rendered as JSON-LD in the root layout. */
export const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  url: siteUrl,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  description: site.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Single-roundtrip git tree traversal",
    "100-point repository health rubric with evidence",
    "Dynamic shields.io badge endpoint",
    "1-click atomic pull request remediation",
  ],
};
