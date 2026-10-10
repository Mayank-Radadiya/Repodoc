# Repodoc Landing Page Redesign — Architecture & Design Spec

## 1. Executive Summary & Goals
This document specifies the complete, ground-up redesign of the **Repodoc** landing page. The goal is to elevate Repodoc from an ordinary marketing page into a top-tier, art-directed developer tool experience on par with Linear, Raycast, and DaemonDoc.

### Core Value Proposition
- **Single-Roundtrip Git Tree Traversal:** Resolves 90%+ of repository presence checks in a single recursive API call (`GET /git/trees/{sha}?recursive=1`), executing in-memory set lookups in `<1ms`.
- **Defensible 100-Point Scoring Rubric (v1.0):** Evaluates markdown AST headings and structured file presence rather than arbitrary word counts.
- **Shields.io Dynamic JSON Endpoint:** Delivers real-time badge metadata via `/api/badge/[owner]/[repo]` (`schemaVersion: 1`).
- **1-Click Atomic PR Remediation:** Constructs multi-file fixes via the low-level Git Data API (`blobs` → `tree` → `commit` → `PR`) on an idempotent branch (`repodoc/health-remediation`).

---

## 2. Visual Design System

### 2.1 Color Palette & Foundations
- **Base Surfaces:** Pure White (`#FFFFFF`) background, Slate-50 (`#F8FAFC`) cards and alternate sections, Slate-950 (`#020617`) obsidian terminal and code viewports.
- **Borders & Dividers:** Hairline borders (`border-slate-200/80`), blueprint accents (`border-dashed border-slate-200`), dark code borders (`border-slate-800`).
- **Accent Tokens:**
  - **Cobalt Blue (`#005FD6`):** Primary branding, interactive links, primary buttons.
  - **Electric Sky (`#209BFF`):** Secondary data flow accents, AST tokens, ambient card accents.
  - **Verified Emerald (`#10B981`):** Passing checks, high health scores (90+), clean git diff additions.
  - **Warning Amber (`#F59E0B`):** Missing hygiene files, remediation callouts.
- **Restraint Rule:** No multi-colored AI gradients, no gratuitous glow halos, no muddy dark-mode hybrids.

### 2.2 Typography & Sizing
- **Heading Font:** Space Grotesk (`var(--font-space-grotesk)`)
  - `h1`: 56px–68px desktop, 32px mobile. `tracking-[-0.032em]`, `leading-[1.10]`, high contrast.
  - `h2`: 32px–40px desktop, 26px mobile. `tracking-[-0.028em]`, `leading-[1.18]`, bold.
  - `h3`: 18px–22px, `tracking-[-0.02em]`, bold.
- **Body & UI Font:** Inter (`var(--font-inter)`)
  - Body: 15px–17px, `text-slate-600`, `leading-relaxed`, `tracking-[-0.011em]`.
  - UI labels: 13px–14px, `font-medium`, `text-slate-700`.
- **Code & Telemetry Font:** Geist Mono (`var(--font-geist-mono)`)
  - Git SHAs, file paths, JSON endpoints, diff lines: 11px–13px, `leading-relaxed`.
  - Eyebrow badges: 11px uppercase, `tracking-wider`, `font-semibold`.

### 2.3 Elevation Scale
- `--shadow-card`: `0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -20px rgba(15, 23, 42, 0.28)`
- `--shadow-raised`: `0 1px 2px rgba(15, 23, 42, 0.05), 0 18px 44px -24px rgba(15, 23, 42, 0.32)`
- `--shadow-overlay`: `0 2px 6px rgba(15, 23, 42, 0.06), 0 32px 72px -32px rgba(15, 23, 42, 0.40)`

---

## 3. Information Architecture & Section Hierarchy

### Section 1: Floating Resizable Navigation (`LandingNavigation`)
- Sticky glass navbar with scroll-aware contrast transition (dark-scrim contrast when over hero photo, crisp white glass when scrolled).
- Anchor links: *Observatory*, *How it works*, *Rubric & Platform*, *Diff Lab*, *FAQ*.
- Primary CTA: *Audit Any Repo*.

### Section 2: Hero & Interactive Audit Console (`HeroConsole`)
- **Full-Bleed Photographic Header:** Scroll-driven rounded frame inset (0 → 32px border radius, 0 → 14px margin inset on scroll).
- **Hero Copy:**
  - Eyebrow: `Single-roundtrip Git tree traversal — 100-point defensible audit`
  - Headline: `From git clone to defensible audit in seconds.`
  - Subheadline: `No vanity word counts. Parse markdown ASTs, verify required hygiene, embed dynamic shields.io health badges, and fix gaps in one reviewable PR.`
- **Interactive Target Input Bar:**
  - Monospace repository prompt with interactive presets: `facebook/react`, `astral-sh/uv`, `shadcn/ui`, `sample/atlas-cli`.
- **Embedded Interactive Observatory Cockpit:**
  - Browser chrome with macOS window controls and URL pill.
  - Left column: Circular SVG health gauge, dynamic score (80 vs 100), 5 rubric category progress indicators, and "Simulate 1-Click Fix PR" toggle.
  - Right column: Tabbed findings inspector (AST heading tokens, license verification, missing `.gitignore`/CI) and live Shields.io endpoint JSON + badge preview with 1-click Markdown copy.

### Section 3: Telemetry & Performance Metrics Strip (`MetricsStrip`)
- 4 high-signal engineering cards:
  - `<1ms` in-memory set lookups via single recursive tree call.
  - `0 Rate-Limit Quota` hit via `304 Not Modified` ETag conditional headers.
  - `100% Shields.io Compatible` dynamic JSON endpoint schema v1.
  - `1 Atomic Commit` on idempotent branch `repodoc/health-remediation`.

### Section 4: 3-Stage Blueprint Flow (`BlueprintSteps`)
- Architectural blueprint cards with dashed crosshairs and technical badges:
  1. **Traverse Tree in 1 Call:** `GET /git/trees/{sha}?recursive=1`
  2. **Defensible AST Rubric:** AST heading parser and manifest checks across 5 core categories.
  3. **1-Click Atomic PR:** Git Data API multi-blob tree assembly and commit.

### Section 5: Platform Architecture Bento (`RubricBento`)
- **Card 1 (Left):** 100-Point Rubric breakdown with category weights (Documentation 25pts, Testing 25pts, Hygiene 20pts, Community & Security 30pts).
- **Card 2 (Right):** Context-Aware Manifest Engine showing detection for Node, Python, Rust, Go, Java, Docker without penalizing libraries.
- **Card 3 (Full-Width Bottom):** Git Data API Atomic Pipeline circuit diagram displaying Blob creation → Tree packing → Commit generation → Pull Request creation.

### Section 6: Interactive Remediation & Diff Lab (`RemediationLab`)
- **Left Column:** Selection controls for missing hygiene files (`.gitignore`, `.github/workflows/ci.yml`), projected score climb (`80 -> 100`), and idempotent branch status.
- **Right Column:** High-fidelity git diff viewer with line numbers, `+` diff indicators, and syntax highlights.

### Section 7: Shields.io Dynamic Badge Showcase (`BadgeShowcase`)
- Live preview of shields.io badges (`brightgreen`, `green`, `yellow`, `orange`, `red`).
- Interactive URL generator with 1-click Markdown copy.

### Section 8: Technical FAQ (`FaqAccordion`)
- 6 critical questions with smooth motion accordion expansion:
  1. Single-roundtrip tree traversal mechanics.
  2. Non-destructive guarantees (never overwrite existing files).
  3. Why AST heading tokens beat word counts.
  4. Shields.io endpoint architecture.
  5. HTTP 304 ETag rate-limit protection.
  6. SPDX legal license prompting rationale.

### Section 9: Developer-Grade Footer (`SiteFooter`)
- Clean, structured engineering footer with rubric version tag (`v1.0.0`), links to GitHub API docs, shields.io spec, and system status.

---

## 4. Animation & Motion Design
- **Motion Engine:** `motion/react` (`motion` package).
- **Accessibility:** Full `useReducedMotion()` support across all components. When reduced motion is preferred, transitions fall back to instant or opacity-only.
- **Micro-Interactions:** Subtle hover states, animated circular SVG gauge, tab transitions, smooth accordion height easing (`[0.16, 1, 0.3, 1]`).

---

## 5. Verification & Testing Plan
- **Desktop & Mobile Responsiveness:** Verify navigation collapse, hero frame scaling, cockpit grid collapse (12-column to stacked), and diff viewer horizontal scrolling on mobile.
- **Interactive State Testing:** Verify toggling presets updates the audit score, badge response, and git diff.
- **Build & Quality:** Run `pnpm build`, `pnpm lint`, and ensure zero TypeScript or ESLint errors.
