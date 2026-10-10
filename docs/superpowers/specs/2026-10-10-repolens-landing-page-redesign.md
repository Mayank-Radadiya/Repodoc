# Specification: Repodoc Landing Page Redesign

**Date:** 2026-10-10  
**Status:** Approved  
**Reference Design:** `DaemonDoc/seo-client`  
**Target Codebase:** `Repodoc` (Next.js 16.4 App Router, React 19, Tailwind CSS v4, Turbopack, `motion/react`)

---

## 1. Executive Summary & Goals

Redesign the Repodoc landing page to replicate the visual caliber, interaction craft, typography, responsive behavior, and architectural precision demonstrated in `DaemonDoc/seo-client`. 

Rather than adopting a superficial skin, this redesign adapts DaemonDoc's foundational design patterns to Repodoc's specific mission:
- **Instant GitHub Repository Auditing:** Single-roundtrip Git tree traversal (`GET /git/trees/{sha}?recursive=1`).
- **Defensible 100-Point Scoring Rubric (v1.0):** 5 categorized, evidence-backed pillars replacing vanity word counts.
- **Dynamic Shields.io Endpoint Badges:** Standard JSON endpoint (`/api/badge/[owner]/[repo]`).
- **1-Click Atomic PR Remediation:** Low-level Git Data API orchestration (`POST /git/blobs` → `trees` → `commits`) fixing hygiene gaps in a single atomic commit.

---

## 2. Design System, Typography & Color Tokens

### 2.1 Typography
- **Display / Headings:** `Space_Grotesk` (Google Font via `next/font/google`, variable `--font-space-grotesk`), loaded with optical sizing, letter-spacing tight (`-0.032em`), line-height `1.08` to `1.16`.
- **Body & UI:** `Inter` (variable `--font-inter`), optimized letter-spacing (`-0.011em`), legible contrast on slate-600/slate-900.
- **Monospace:** `Geist_Mono` (variable `--font-geist-mono`) for file paths, terminal commands, and repository URLs.

### 2.2 Color Palette & Elevation Scale
- **Primary Accent:** Electric Blue `#005FD6` with secondary `#209BFF`.
- **Status Accents:** Emerald `#10b981` (passed checks / brightgreen badge), Amber `#f59e0b` (warning / missing file), Violet/Indigo `#8b5cf6` (CI workflows).
- **Backgrounds:** Crisp white `#ffffff` canvas, subtle slate-50/50 section banding, dark glass `#020617` (slate-950/90) for code/audit mockups.
- **Elevation Tokens:**
  - `--shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -20px rgba(15, 23, 42, 0.28)`
  - `--shadow-raised: 0 1px 2px rgba(15, 23, 42, 0.05), 0 18px 44px -24px rgba(15, 23, 42, 0.32)`
  - `--shadow-overlay: 0 2px 6px rgba(15, 23, 42, 0.06), 0 32px 72px -32px rgba(15, 23, 42, 0.4)`
- **Architectural Dashed Borders:** Blueprint-style grid crosslines (`border border-dashed border-neutral-200`) extending across card quadrants.

---

## 3. Component Architecture & Section Specifications

### 3.1 Navigation (`ResizableNavbar` & `LandingNavigation`)
- **Behavior:** Fixed `z-50` bar across the top.
- **Threshold Transformation:** When scroll offset <= 100px, spans full width with white text floating over the landscape photo. When scroll > 100px, smoothly transitions into a floating 60% width pill with `bg-white/95`, border, and `shadow-[0_1px_0_rgba(0,0,0,0.04),0_4px_20px_rgba(34,42,53,0.10)]`.
- **Interactive Elements:**
  - Logo with Repodoc mark + Space Grotesk wordmark.
  - Hover pill indicator using `motion.div layoutId="nav-hovered"`.
  - Links: *How it works*, *Rubric & Bento*, *Fix Playground*, *FAQ*.
  - Right CTA: High-gloss `CandyLink` to sample audit.
  - Mobile: Clean hamburger menu with sliding sheet, escape key listener, and body scroll lock.

### 3.2 High-Gloss Candy Button (`CandyButton` / `CandyLink`)
- Exact DaemonDoc button with radial gradient `[radial-gradient(95%_60%_at_50%_75%,#005FD6_0%,#209BFF_100%)]`.
- Top specular highlight line `after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent`.
- Ambient blue glow `shadow-[0px_4px_48px_-12px_#1187FF,inset_0px_1px_8px_-4px_#FFFFFF]`.
- Press feel: `active:scale-[0.97]` with smooth release.

### 3.3 Hero Section (`Hero`)
- **Scroll-Driven Frame Inset:** Full-bleed background panel using `public/landing/repository-landscape.png` with Motion `useScroll` progressively transforming `border-radius: 0 → 32px` and `margin-x: 0 → 14px` on scroll.
- **Eyebrow Pill:** Glassmorphic badge with sparkles icon: *"Single-roundtrip Git tree traversal — 100-point defensible audit"*.
- **Display Headline:** *"From git clone to defensible audit in seconds."* (Space Grotesk, ~64px desktop, crisp text-shadow).
- **Interactive Repository Prompt Bar:** Dark glass container (`bg-slate-950/90`, `ring-1 ring-white/40 backdrop-blur-md`) with simulated repo input (`github.com/facebook/react`), audit mode pills (*Full Audit*, *Atomic PR*, *Shield Badge*), and instant "Run Audit" CandyButton.

### 3.4 Live Repository Observatory (`HeroObservatory`)
- Browser chrome mockup with macOS traffic lights (`bg-red-400`, `bg-amber-400`, `bg-emerald-400`) and URL pill `repodoc.dev/report/atlas-cli`.
- Interactive audit cockpit:
  - Real-time animated score gauge (80/100, dynamic SVG stroke arc).
  - Categorized summary chips: Documentation (25/25), Hygiene (15/20), Testing & CI (10/25), Community (15/15), Security (15/15).
  - Shields.io badge preview snippet: `[![Repo Health](https://repodoc.dev/api/badge/sample/atlas-cli)]`.
  - Quick action buttons to toggle inspection view.

### 3.5 Project-Type Manifest Strip (`EcosystemStrip`)
- Visual strip with cards representing supported manifests: TypeScript/Node (`package.json`), Python (`setup.py` / `pyproject.toml`), Rust (`Cargo.toml`), Go (`go.mod`), Java (`pom.xml`), Docker (`Dockerfile`).
- Explanatory copy: *"Repodoc adapts to project types: libraries are never penalized for missing application files."*

### 3.6 3-Step Blueprint Grid (`Steps`)
- Centered grid with dashed blueprint intersection lines:
  1. **Traverse Tree:** `GET /git/trees/{sha}?recursive=1` reads the entire structure in 1 network call (<1ms set lookups).
  2. **Audit Rubric:** AST heading parser and heuristic engine grade 12 defensible checks across 5 categories.
  3. **1-Click Atomic PR:** Git Data API generates blobs, trees, and commit on `repodoc/health-remediation`.

### 3.7 Platform Bento Grid (`PlatformBento`)
- **Card 1: 100-Point Scoring Rubric (ModelCard style)**
  - Detailed point weights, AST heading verification (Installation, Usage, Contributing), and live status chips (*Passed*, *Missing*, *Automated*).
- **Card 2: Real-time Git Audit Stream (ChatCard style)**
  - Real-time audit activity feed showing recent scans (`octocat/linguist`, `facebook/react`, `vercel/next.js`), execution time, points awarded, and pulsing *"Listening for webhook push"* indicator.
- **Card 3: Atomic Git Data API PR Engine (IngestCard style, 2-column wide)**
  - Bespoke SVG circuit animation (`LineSvg`, `StraightLine`, `PulseBorderIcon` with glowing animated filters) showing:
    - Inputs: `LICENSE` (SPDX selection), `.gitignore` (template), `ci.yml` (GitHub Actions).
    - Flowing along animated electric blue and purple dashed SVG pathways into the central Git Data API processor.
    - Output: Single atomic commit SHA on an idempotent branch with automated PR creation.

### 3.8 Interactive Fix-with-PR Playground (`FixPlayground`)
- Seamlessly integrated diff and remediation laboratory:
  - Checkboxes for missing hygiene files (`.gitignore`, `.github/workflows/ci.yml`).
  - Real-time diff viewer showing added file blobs.
  - Live recalculation of health score jumping from **80/100** to **100/100**.

### 3.9 Core Capabilities Grid (`CoreCapabilities`)
- 6 engineering-grade cards with dashed borders:
  1. *Single-Call Tree Traversal* (eliminates recursive N+1 API calls).
  2. *Low-Level Git Data API* (atomic commits via blobs, trees, commits).
  3. *ETag Conditional Requests* (304 Not Modified preserves rate-limit quota).
  4. *Shields.io Endpoint Compliance* (zero edge rendering bottleneck).
  5. *Legal-Safe License Prompting* (user chooses SPDX template; never auto-guessed).
  6. *Idempotent Branch Safety* (clean updates without merge conflicts).

### 3.10 Interactive FAQ (`Faq`)
- Split 5-col / 7-col layout matching DaemonDoc.
- Animated Motion accordion answering:
  - How does single-roundtrip tree traversal work?
  - Does Repodoc overwrite existing repository files?
  - How is health scored without vanity word counts?
  - How do dynamic shields.io badges work?
  - What GitHub permissions are required?
  - Can I customize the 100-point rubric for internal teams?

### 3.11 Footer (`Footer`)
- Polished footer with Repodoc branding, product links, rubric version note, shields.io integration badge, and GitHub repository link.

---

## 4. Verification & Quality Acceptance Criteria

1. **Visual Calibration:**
   - Full layout visual fidelity matches `DaemonDoc/seo-client` on desktop (1440px) and mobile (375px).
   - Crisp Space Grotesk typography, tight tracking, and seamless elevation shadows.
2. **Animation & Accessibility:**
   - Smooth `motion/react` animations honoring `prefers-reduced-motion`.
   - Focus rings (`:focus-visible`) and ARIA labels on all interactive controls.
3. **Build & Type Safety:**
   - Clean execution of `bun run lint` (0 ESLint errors/warnings).
   - Clean execution of `bun run build` with Turbopack (no TypeScript errors, valid static pages).
4. **Interactive Fidelity:**
   - Working sample audit actions, interactive diff inspection in Fix Playground, and expandable FAQ accordions.
