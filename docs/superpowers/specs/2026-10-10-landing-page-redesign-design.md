# Repodoc Landing Page Redesign — Design Specification

**Date:** 2026-10-10  
**Status:** Approved  
**Topic:** Ground-up Landing Page Redesign & Engineering Cockpit  
**Classification:** Architectural  

---

## 1. Executive Summary & Design Vision

Repodoc is an engineering-first repository governance, health audit, and automated remediation tool. Its primary differentiation is **defensible evidence** (no superficial word counts) and **atomic remediation** (fixing missing licenses, .gitignore, and CI in a single commit via the low-level Git Data API).

The new landing page replaces generic SaaS tropes with a **Minimalist High-Density Darkroom** aesthetic inspired by the craftsmanship of `DaemonDoc`. It combines deep graphite backgrounds, hairline architectural borders, phosphor-green and cyan telemetry accents, terminal-grade typography, and a live **Dual-Mode Inspector Cockpit**.

---

## 2. Visual Design System & Design Tokens

### 2.1 Color Palette
- **Canvas Base (`--bg-canvas`):** `#06080d` (pure deep graphite black)
- **Surface Level 1 (`--bg-surface-1`):** `#0b0f17` (subtle dark navy/slate for cards and window bodies)
- **Surface Level 2 (`--bg-surface-2`):** `#111827` (elevated containers, tab bars, active states)
- **Borders & Dividers:** `rgba(255, 255, 255, 0.08)` (crisp 1px hairlines), `rgba(255, 255, 255, 0.16)` on active/hover
- **Architectural Guidelines:** `rgba(255, 255, 255, 0.05)` dashed lines (`border-dashed`) with crosshairs
- **Telemetry Accents:**
  - **Phosphor Green:** `#22c55e` / `rgb(34, 197, 94)` — Passing tests, scores 90+, green git additions (`+`)
  - **Telemetry Cyan:** `#38bdf8` / `#06b6d4` — Git tree traversal, shields.io badge endpoints, API readiness
  - **Remediation Amber:** `#f59e0b` — Missing hygiene warnings, license selection required
  - **Critical Rose:** `#f43f5e` — Failing tests, missing critical security policies
- **Text & Foreground:**
  - **Heading White:** `#f8fafc` (high-contrast cool white)
  - **Body Slate:** `#94a3b8` (comfortable, low-fatigue slate-400)
  - **Muted / Mono Comments:** `#64748b` (slate-500)

### 2.2 Typography System
- **Display Headings (`font-display`):** Space Grotesk / Inter Display, negative optical tracking (`tracking-[-0.03em]`), regular to medium weight for large display sizes to avoid bulky clunkiness.
- **Body (`font-sans`):** System-UI / Inter, 15px–16px, relaxed line-height (`leading-relaxed`).
- **Telemetry & Code (`font-mono`):** JetBrains Mono / Geist Mono, tabular figures (`font-variant-numeric: tabular-nums`), 12px–13px for paths, SHAs, and diff lines.

---

## 3. Page Structure & Narrative Flow

### 3.1 Translucent Engineering Navigation (`LandingNavigation`)
- Sticky blurred header with hairline bottom border (`backdrop-blur-md bg-[#06080d]/80 border-b border-white/5`).
- Repodoc brand mark with phosphor status pip (`● v1.0 Ready`).
- Anchor navigation links: `Audit Cockpit`, `How It Works`, `100-Pt Rubric`, `Shields Badge`, `Remediation`, `FAQ`.
- GitHub repository counter pill + "Start Audit" primary button.

### 3.2 Hero Section (`Hero`)
- Eyebrow telemetry pill: `Single-call Git tree traversal • Defensible Rubric v1.0 • 1-Click Atomic PR`.
- Display Headline: *"From public URL to defensible audit in seconds."*
- Subheadline: *"No vanity word counts. Parse markdown ASTs, verify required hygiene, embed dynamic shields.io health badges, and fix gaps in one reviewable PR."*
- Repository command bar:
  - Input with prompt cursor: `github.com/astral-sh/uv` (or user input).
  - Quick-select repository chips: `astral-sh/uv`, `facebook/react`, `shadcn-ui/ui`, `sample/atlas-cli`.
  - Primary Action Button: "Run Audit" with lightning icon.

### 3.3 Centerpiece: Dual-Mode Inspector Cockpit (`DualInspector`)
An authentic Mac window frame with traffic light controls (`red`, `yellow`, `green`), repository title bar, and tab switcher:

#### Tab 1: Audit Diagnostics (`AuditView`)
- Circular SVG health gauge displaying current repository score (e.g., `88/100 Grade A`).
- Real-time Shields.io badge preview (`[![repo health](https://img.shields.io/endpoint?url=...)](...)`).
- 5 Category progress meters:
  1. Documentation (22/25 pts)
  2. Project Hygiene (15/20 pts)
  3. Testing & CI/CD (25/25 pts)
  4. Community & Metadata (11/15 pts)
  5. Security Baseline (15/15 pts)
- Expandable evidence checklist showing actual files checked (e.g., `README.md` AST headings detected, OSI license validation, GitHub Actions workflow presence).

#### Tab 2: Atomic Git PR Diff (`DiffView`)
- Interactive 3-file explorer:
  - `LICENSE` (Apache-2.0 / MIT)
  - `.gitignore` (Language-tailored)
  - `.github/workflows/ci.yml` (Standard test runner)
- Unified syntax-colored Git diff viewer with line numbers, green addition indicators (`+`), and commit metadata:
  - `Branch: repodoc/health-remediation`
  - `Commit: 8f4a1c0 "chore: automated repository health remediation"`
  - `Action: POST /repos/{owner}/{repo}/pulls`
- "Simulate 1-Click PR" interactive button with success toast/state.

### 3.4 3-Step Architectural Blueprint (`EngineBlueprint`)
- Structured grid with dashed engineering hairline crosshairs (`border-dashed border-white/10`):
  1. **Single-Roundtrip Git Tree Traversal:** Resolves 90%+ of presence checks via `GET /git/trees/{sha}?recursive=1` in `<1ms`.
  2. **Context-Aware AST Heading Engine:** Differentiates libraries vs. applications, parsing structured headings (`# Installation`, `# Usage`) without dumb word counts.
  3. **Atomic Git Data API Orchestration:** Bundles Blobs, Trees, and Commits (`POST /git/blobs` → `/git/trees` → `/git/commits`) into an idempotent pull request.

### 3.5 100-Point Defensible Rubric Matrix (`RubricMatrix`)
- High-density matrix detailing the 5 rubric categories (100 points total):
  - Documentation (25 pts): `README.md` presence, essential headings, architecture overview, `CONTRIBUTING.md`.
  - Project Hygiene (20 pts): OSI License, language `.gitignore`, Code of Conduct.
  - Testing & CI/CD (25 pts): GitHub Actions workflow, test script/directory in manifest.
  - Community & Metadata (15 pts): Issue/PR templates, repo description & topics.
  - Security Baseline (15 pts): `SECURITY.md` policy, dependency scanning config.
- Each check indicates whether it is automatable via 1-click PR.

### 3.6 Live Shields.io Badge Studio (`BadgeStudio`)
- Interactive studio allowing developers to enter owner/repo and instantly preview:
  - Live shields.io badge preview with color thresholds (`brightgreen` >= 90, `green` >= 75, `yellow` >= 60, `orange` >= 40, `red` < 40).
  - One-click copyable Markdown snippet.
  - One-click copyable HTML snippet.
  - Live JSON response preview from `/api/badge/:owner/:repo`.

### 3.7 Atomic PR Remediation Studio (`RemediationStudio`)
- Interactive playground to configure remediation options:
  - License selector: MIT, Apache-2.0, BSD-3-Clause (adhering to the rule that licenses require user selection).
  - Ecosystem detection: Node.js, Rust, Python, Go.
  - Commit payload preview: inspect the raw Git tree and blob contents before PR creation.

### 3.8 Developer Truths & FAQ (`FaqSection`)
- Accessible accordion addressing:
  - Why not rely on line or word counts?
  - How does Repodoc differ from OpenSSF Scorecard and GitHub community profiles?
  - How does rate limit caching work (ETag `304 Not Modified`)?
  - Does it support monorepos?
  - How are permissions handled for forks vs direct repo access?

### 3.9 Engineering Footer (`Footer`)
- System status indicator (`Shields API: Operational`, `Git Tree Engine: 100%`).
- API documentation links, GitHub repository link, rubric specification version (v1.0), and MIT license notice.

---

## 4. Animation & Micro-Interactions (Motion)

- **Entry Animations:** Subtle fade-up with staggered children using `motion/react`.
- **Tab Transitions:** Layout spring transitions for seamless mode switching in the Inspector Cockpit (`stiffness: 260`, `damping: 24`).
- **Interactive Feedback:** Micro-bounce on quick-select chips, instant clipboard copy animations with SVG checkmarks.
- **Accessibility:** Mandatory `useReducedMotion()` wrapper disabling transforms and spring physics when reduced motion is preferred by the operating system.

---

## 5. Verification & Testing Plan

1. **Type Checks & Linting:** `bun run lint` and TypeScript compilation passing with zero warnings or errors.
2. **Component Isolation:** Ensure all mock and data structures conform to the types in `idea.md`.
3. **Cross-Device Responsiveness:** Complete test verification at mobile (375px), tablet (768px), and desktop (1280px+).
4. **Performance:** Zero layout shifts, no heavy image/video bloat, pure SVG and CSS graphics.
