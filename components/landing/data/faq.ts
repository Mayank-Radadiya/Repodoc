import type { FaqItem } from "../types";

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does single-roundtrip tree traversal work?",
    answer:
      "Repodoc calls GitHub's low-level Git Trees API once (GET /git/trees/{sha}?recursive=1). This returns the repository's entire file tree in one JSON payload, allowing the engine to execute 90%+ of file presence checks in memory in under 1ms with zero N+1 API cascades.",
  },
  {
    question: "Will the 1-click PR overwrite any existing files?",
    answer:
      "Never. The remediation engine strictly verifies that candidate hygiene files do not exist in the target tree before generating blobs. Existing project files, custom workflows, or licenses are never modified or overwritten.",
  },
  {
    question: "Why does Repodoc avoid README word count metrics?",
    answer:
      "Word count is a vanity proxy that penalizes concise documentation. Repodoc parses Markdown ASTs into structured heading tokens, verifying the presence of essential sections (e.g., Installation/Setup, Usage/Quickstart) regardless of verbosity.",
  },
  {
    question: "How does the Shields.io badge endpoint work?",
    answer:
      "Rather than running a slow server-side SVG/PNG canvas renderer, Repodoc serves standard shields.io endpoint JSON at /api/badge/[owner]/[repo]. Shields.io queries this endpoint and delivers CDN-cached SVG badges directly to your README.",
  },
  {
    question: "How does Repodoc prevent GitHub rate-limit exhaustion?",
    answer:
      "All audits leverage HTTP Conditional Requests with ETags (If-None-Match). When an audited repository has had no new commits since the last inspection, GitHub returns 304 Not Modified, consuming zero unauthenticated rate-limit quota.",
  },
  {
    question: "Why doesn't Repodoc automatically pick an open-source license?",
    answer:
      "Choosing a software license carries legal implications. The remediation engine identifies missing licenses and prompts maintainers for explicit SPDX selection (MIT, Apache-2.0, BSD-3, MPL-2.0) rather than guessing on their behalf.",
  },
];
