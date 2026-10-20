# Performance and reliability audit — 2026-10-20

The application fixes are implemented and verified. The final PostgreSQL suite passed **2,249 tests**, with **one opt-in live GitHub test skipped**. Lint and TypeScript passed. An isolated production build on Node 24.22.0 and Chromium checks passed, including an authenticated dashboard with 100 synthetic repositories. No hosted deployment or live GitHub writes were performed.

The later human decision in the coordinated production-readiness chat selected **PostgreSQL only**, superseding the original proposal to retain a SQLite development/test provider. Existing SQLite files and private environment credentials were left untouched. Production migrations, configuration, CI, and the three readiness smoke tests are documented separately in [readiness.md](readiness.md).

## Verified changes, ranked by impact

| Priority | Finding and resulting behavior | Evidence |
| --- | --- | --- |
| P1 | Missing build-time OAuth settings could permanently prerender the dashboard's anonymous redirect. Session loading now reads request headers before optional configuration validation. | Before: `/dashboard` built as static, and a valid runtime session still received a 307 sign-in redirect. After: partial prerender; the same runtime configuration serves the authenticated 100-repository dashboard. |
| P1 | A Git tree ETag does not cover description, topics, or branch settings. A 304 now refreshes the metadata check and score when necessary, keeping the share ID. | Regression covers changed metadata/branch with exactly two GitHub requests and no blob downloads. Identical persisted metadata avoids writes; structural comparison tolerates PostgreSQL JSONB key ordering and omitted optional properties. |
| P1 | Requests and response-body parsing could wait indefinitely. | Cancellation-aware deadlines cover GitHub requests (20 seconds), reads (60 seconds), and remediation (240 seconds). The existing 15-second fork-readiness limit remains. Tests cover stalled bodies, caller aborts, inherited budgets, and timer cleanup. Controlled timeout responses use HTTP 504. Ambiguous network failures are not automatically replayed. |
| P1 | React Activity hides pages while preserving state. Aborted work could leave pending flags set when the user returned. | Activity regressions verify restored report/dashboard controls, cancellation of abandoned reads, ignored late results, and interrupted-remediation guidance to check existing PRs before retrying. Remediation never automatically restarts on return. |
| P2 | Server error screens preferred `reset()`, which does not re-fetch server content in this Next.js version. | Report/share screens now prefer `retry()`; existing and updated error-boundary tests pass. |
| P2 | Dashboard reads loaded complete report JSON and reports outside the displayed repository set. | The dashboard still performs one batched report query, now restricted to loaded repositories and four summary fields. An empty repository list performs **zero** report queries instead of one. Upserts return only the share ID. No additional index or cross-user cache was introduced. |
| P2 | A closed audit dialog pulled its client code into the initial route. | Defer its module until the first opening, retaining the loaded dialog afterward. Dashboard/share initial bundles shrink by approximately 30 KB raw / 10 KB gzip. Existing navbar/shell tests pass; Chromium confirms opening, Escape dismissal, and focus restoration. |
| P2 | Simulations left timers alive after panel removal; clipboard rejection falsely reported success; a failed background image could keep the WebGL loop awake. | Owned timers are cleared, clipboard rejection displays an error, and failed image loading stops animation and preserves a static fallback. Image handlers/source references are released after upload or failure; WebGL resources and observers are cleaned up on removal. Targeted tests and final production compilation pass. |

Successful API payloads, scoring weights, authorization checks, report URLs, cache freshness rules, and atomic remediation safeguards remain intact.

## Measured bundle and browser results

The baseline is the repository's HEAD application. Both baseline and final sources were built using the same installed dependencies and Node 24.22.0 in isolated copies. Only their temporary Turbopack configuration used a filesystem-root override to resolve linked dependencies. That override is **not** a repository change or deployment recommendation.

The table sums each route's initial chunks once. Gzip sizes are calculated per chunk with Node zlib defaults; actual browser transfers can also include prefetches and subsequently loaded chunks.

| Route | Initial JS before → after, bytes | Computed gzip before → after, bytes | Gzip saved |
| --- | ---: | ---: | ---: |
| Landing | 1,073,181 → 1,072,652 | 343,294 → 343,060 | 234 |
| Dashboard | 935,441 → 904,999 | 298,539 → 288,011 | **10,528 (3.5%)** |
| Report | 1,030,399 → 1,029,532 | 330,423 → 330,384 | 39 |
| Share | 1,001,742 → 972,861 | 320,425 → 310,353 | **10,072 (3.1%)** |

No meaningful landing/report bundle reduction is claimed. The measured improvement comes from delaying the hidden audit dialog; its first opening makes two additional script requests.

Chromium exercised all four routes at 1440×1000 with reduced motion, a disposable PostgreSQL 18 database, synthetic authenticated GitHub GET responses, and external writes disabled. Observed local LCP was 176 ms landing, 320 ms dashboard, 96 ms report, and 64 ms share; CLS was below 0.001 on each. These single local samples are diagnostic observations, **not production Core Web Vitals or latency targets**. There were no page errors and no automatic audit POSTs for the saved report or shared report.

After warming report/share navigation and collecting garbage, repeated client navigation produced:

| Completed round trips | Used JS heap, bytes | DOM nodes | JS event listeners |
| --- | ---: | ---: | ---: |
| 10 | 10,253,644 | 1,578 | 601 |
| 15 | 10,417,812 | 1,578 | 601 |
| 20 | 10,524,028 | 1,578 | 601 |

DOM/listener counts remained constant and heap growth tapered. This short run does not establish an unbounded leak or prove long-session memory stability. GPU/image memory is outside these JS heap measurements.

The exact aggregate measurements, browser version, resource counts, memory samples, and methodology are in [performance-measurements.json](performance-measurements.json).

## Loading and failure verification

- The full unit/component/integration suite covers empty repositories, search with no matches, malformed responses, rate limits, missing repositories/reports, storage failures, duplicate submissions, deadlines, cancellation, authorization, and remediation failures.
- Production Chromium verified loading feedback while retaining a saved report, simulated offline failure, a usable retry, recovery after retry, missing-share presentation, and anonymous remediation rejection with 401.
- At 390×844, the report had no horizontal overflow. Desktop dashboard rendering and mobile failure presentation were visually inspected.
- The final image-reference cleanup was followed by all five WebGL component tests, clean lint/TypeScript checks, a fresh production build, and another browser profile/failure run. The full PostgreSQL suite had passed immediately before that cleanup.
- The coordinated readiness pass also ran migration deployment/redeployment/status/drift checks and all three production Chromium smoke tests. See [readiness.md](readiness.md) for the commands and environment limitations.

## Remaining bottlenecks and deployment limits

1. **Oversized background texture.** The JPEG is roughly 808 KiB but measures **6132×4104** pixels: an estimated **96 MiB** uncompressed RGBA pixel budget before mipmaps. Releasing decoded-image references avoids unnecessary retention; it does not reduce the texture's resolution. Responsive assets or display-sized texture uploads remain the strongest image-memory candidate. No recompression, resolution cap, or visual-quality tradeoff was introduced without device/visual comparisons.
2. **Initial JavaScript remains substantial.** Landing analysis attributed about 162.7 KB of generated client code to Base UI, 141.3 KB to motion-dom/framer-motion, and 70.2 KB to GSAP, before shared compression. These analyzer module totals include the route's client graph and should not be summed as independent network savings. Further animation/UI-library changes require mobile CPU/network traces; removing either animation system would change existing behavior.
3. **Two session bootstrap requests.** Every fresh document made two `/api/auth/session` requests. The installed Auth.js client broadcasts after initial session loading and handles a follow-up session event. This was left intact to preserve session synchronization; an upstream/client initialization investigation can address deduplication separately.
4. **Large repository inputs.** README and manifest blobs are still decoded in full. Truncated Git trees already fail explicitly instead of producing incomplete scores. Large-file limits, evidence caps, or streaming parsers would change accepted inputs and need a defined product policy and representative large-repository traces.
5. **Cold badge audits.** A CDN miss still performs a fresh audit: metadata, tree, and up to two blob requests. Existing badge cache headers remain. Adding another persistent cache would introduce freshness and database-availability tradeoffs; measure actual badge traffic first.
6. **Hosted readiness remains unverified.** The normal workspace build encounters the documented worker-permission restriction; isolated builds passed. Run the ordinary commands in CI/Vercel, configure PostgreSQL and HTTPS/OAuth environment values, and verify hosted connections and real OAuth before deployment. The local Chromium runs used synthetic sessions and GitHub fixtures, not live OAuth or PR creation.

No hosted resources were provisioned, no production database was migrated, and no live GitHub writes were made.
