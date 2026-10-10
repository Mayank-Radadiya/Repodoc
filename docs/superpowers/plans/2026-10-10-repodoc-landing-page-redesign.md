# Repodoc Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Repodoc landing page from scratch as a high-density, professional developer tool experience featuring a WebGL `ReflectShader` hero background, dual-mode diagnostic & git diff cockpit, architectural blueprint flow, defensible 100-point rubric matrix, live shields.io badge studio, atomic PR remediation playground, developer FAQ, and engineering footer.

**Architecture:** Decompose the landing experience into focused, modular, typed React components in `components/landing/`. State for repository selection (`facebook/react`, `astral-sh/uv`, `shadcn-ui/ui`, `sample/atlas-cli`) flows seamlessly into both the 100-point diagnostic radar and the atomic Git unified diff viewer. Motion handles fluid layout springs and scroll-triggered reveals, respecting `useReducedMotion()`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Motion (`motion/react`), Lucide React, WebGL (`ReflectShader`).

**Spec:** `docs/superpowers/specs/2026-10-10-landing-page-redesign-design.md`

## Global Constraints
- **Brand Identity:** Repodoc only (no legacy names or third-party references).
- **Color Discipline:** Minimalist High-Density Darkroom (`#06080d` canvas, `#0b0f17` cards, `#111827` elevated surfaces, hairline borders `rgba(255,255,255,0.08)`, phosphor green `#22c55e`, telemetry cyan `#38bdf8`, warning amber `#f59e0b`).
- **Typography:** Display negative tracking (`tracking-[-0.03em]`), clean system sans for copy, tabular monospace for paths and diff lines.
- **Accessibility:** Reduced motion support via `useReducedMotion()`, full keyboard navigability for tabs and interactive controls.
- **Zero Build Errors:** Must pass `bun run lint` and `bunx tsc --noEmit`.

---

## File Structure & Responsibilities

- `components/originkit/ui/reflect-shader.tsx`: WebGL background shader rendering diagonal chromatic light streaks that dynamically react to pointer motion and hover.
- `components/landing/types.ts`: TypeScript contracts for repositories, rubric categories, evidence items, and git diff files.
- `components/landing/navigation.tsx`: Translucent sticky header with status pip, section anchors, and GitHub repo CTA.
- `components/landing/hero.tsx`: High-impact hero section with WebGL `ReflectShader` background, telemetry pills, display headline, and command bar with quick-repo pills.
- `components/landing/dual-inspector.tsx`: Centerpiece Mac window frame with tabbed switcher between Audit Diagnostics and Atomic Git PR.
- `components/landing/audit-view.tsx`: 100-point circular SVG health gauge, 5 category progress meters, shields.io badge live preview, and expandable evidence check cards.
- `components/landing/diff-view.tsx`: Unified syntax-colored 3-file git diff viewer (`LICENSE`, `.gitignore`, `ci.yml`) with simulated 1-click PR flow.
- `components/landing/engine-blueprint.tsx`: 3-step architectural blueprint with dashed hairline crosshairs explaining Git tree traversal and AST parsing.
- `components/landing/rubric-matrix.tsx`: Defensible 100-point rubric breakdown across 5 categories with clear point allocations and pass/fail rationale.
- `components/landing/badge-studio.tsx`: Interactive Shields.io badge generator with live color threshold previews, markdown, and HTML snippets.
- `components/landing/remediation-studio.tsx`: Interactive "Fix All" studio with license selector (MIT, Apache-2.0, BSD-3-Clause) and commit blob inspector.
- `components/landing/faq-section.tsx`: Developer-first technical FAQ accordion addressing rate limits, monorepos, and defensible criteria.
- `components/landing/footer.tsx`: Engineering footer with API endpoints, schema versioning, and status indicators.
- `app/page.tsx`: Clean assembly of all landing page sections.

---

### Task 1: Shared Types & Sample Audit Data Model

**Files:**
- Create: `components/landing/types.ts`
- Modify: `components/landing/sample-report.ts`

**Interfaces:**
- Consumes: Rubric specifications from `idea.md`
- Produces: `RepoOption`, `RubricCategoryData`, `DiffFile`, `SAMPLE_REPOS_DATA`

- [ ] **Step 1: Define TypeScript interfaces in `components/landing/types.ts`**
  - Define `RepoOption` (`id`, `name`, `score`, `stars`, `type`, `description`, `filesCheckedCount`, `durationMs`).
  - Define `RubricCheck` (`id`, `name`, `category`, `pointsAwarded`, `maxPoints`, `passed`, `evidenceDetails`, `filesChecked`).
  - Define `DiffFile` (`path`, `status`, `additions`, `content`).
- [ ] **Step 2: Update sample data in `components/landing/sample-report.ts`**
  - Provide complete, realistic data for `facebook/react`, `astral-sh/uv`, `shadcn-ui/ui`, and `sample/atlas-cli`.
- [ ] **Step 3: Verify TypeScript compilation**
  - Run `bunx tsc --noEmit`.
- [ ] **Step 4: Commit**
  - `git commit -m "feat(landing): define shared landing data types and sample reports"`

---

### Task 2: Translucent Navigation Header

**Files:**
- Create: `components/landing/navigation.tsx`

**Interfaces:**
- Produces: `<LandingNavigation />` component

- [ ] **Step 1: Implement `LandingNavigation`**
  - Sticky header with `backdrop-blur-md bg-[#06080d]/80 border-b border-white/8`.
  - Repodoc brand mark with green status pip (`● v1.0 Ready`).
  - Navigation anchors (`#cockpit`, `#blueprint`, `#rubric`, `#badge-studio`, `#remediation`, `#faq`).
  - GitHub star pill + "Start Audit" CTA.
  - Mobile drawer/sheet for narrow viewports.
- [ ] **Step 2: Verify component rendering and TypeScript compilation**
  - Run `bunx tsc --noEmit`.
- [ ] **Step 3: Commit**
  - `git commit -m "feat(landing): implement translucent engineering navigation"`

---

### Task 3: Hero Section with WebGL ReflectShader Background

**Files:**
- Create: `components/landing/hero.tsx`

**Interfaces:**
- Consumes: `<ReflectShader />` from `components/originkit/ui/reflect-shader.tsx`, `SAMPLE_REPOS_DATA`
- Produces: `<Hero selectedRepo={...} onSelectRepo={...} />`

- [ ] **Step 1: Integrate `ReflectShader` as background canvas**
  - Mount `<ReflectShader>` inside an absolute container behind the hero content with pointer event passthrough.
  - Configure shader parameters (`tint="#38bdf8"`, `speed={35}`, `brightness={85}`, `thickness={18}`, `background="#06080d"`).
  - Add dark radial scrim overlay to ensure 100% legibility of headline text.
- [ ] **Step 2: Implement Hero Copy & Command Bar**
  - Eyebrow pill: `Single-call Git tree traversal • Defensible Rubric v1.0 • 1-Click Atomic PR`.
  - Space Grotesk headline: *"From public URL to defensible audit in seconds."*
  - Subheadline: *"No vanity word counts. Parse markdown ASTs, verify required hygiene, embed dynamic shields.io health badges, and fix gaps in one reviewable PR."*
  - Command input bar with simulated cursor and quick-select repo chips (`astral-sh/uv`, `facebook/react`, `shadcn-ui/ui`, `sample/atlas-cli`).
- [ ] **Step 3: Verify responsive behavior and TypeScript compilation**
  - Run `bunx tsc --noEmit`.
- [ ] **Step 4: Commit**
  - `git commit -m "feat(landing): implement hero section with reflect-shader WebGL background"`

---

### Task 4: Centerpiece Dual-Mode Inspector Cockpit

**Files:**
- Create: `components/landing/dual-inspector.tsx`
- Create: `components/landing/audit-view.tsx`
- Create: `components/landing/diff-view.tsx`

**Interfaces:**
- Consumes: `selectedRepo` state, `SAMPLE_REPOS_DATA`
- Produces: `<DualInspector selectedRepo={...} />`

- [ ] **Step 1: Implement `AuditView`**
  - Circular SVG health gauge with animated dash offset displaying current repository score (e.g., `88/100 Grade A`).
  - Live shields.io badge preview snippet with copyable markdown.
  - 5 Category progress meters with points breakdown (Documentation, Hygiene, CI/CD, Community, Security).
  - Expandable evidence checklist showing actual files checked and AST headings detected.
- [ ] **Step 2: Implement `DiffView`**
  - 3-file explorer tab selector (`LICENSE`, `.gitignore`, `.github/workflows/ci.yml`).
  - Unified syntax-colored git diff viewer with line numbers and green `+` additions.
  - Commit header showing branch `repodoc/health-remediation`, SHA, and commit message.
  - Simulated "Open Pull Request" action with interactive state.
- [ ] **Step 3: Implement `DualInspector` wrapper**
  - Mac browser window chrome with macOS traffic lights (`red`, `amber`, `emerald`) and repository title.
  - Animated tab switcher between "Audit Diagnostics" and "Atomic Git PR" using `motion/react` spring transitions.
- [ ] **Step 4: Verify TypeScript compilation**
  - Run `bunx tsc --noEmit`.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(landing): build dual-mode inspector cockpit with live audit and git diff"`

---

### Task 5: 3-Step Architectural Blueprint & 100-Point Rubric Matrix

**Files:**
- Create: `components/landing/engine-blueprint.tsx`
- Create: `components/landing/rubric-matrix.tsx`

**Interfaces:**
- Produces: `<EngineBlueprint />`, `<RubricMatrix />`

- [ ] **Step 1: Implement `EngineBlueprint`**
  - Grid with dashed engineering hairline crosshairs (`border-dashed border-white/10`).
  - 3 steps: Single-roundtrip Git tree traversal (`<1ms`), Context-aware AST heading engine, and Atomic Git Data API orchestration.
- [ ] **Step 2: Implement `RubricMatrix`**
  - Interactive 5-category breakdown tabs (Documentation, Hygiene, CI/CD, Community, Security).
  - Point weightings, test criteria, and "Automatable via 1-Click PR" badges.
- [ ] **Step 3: Verify TypeScript compilation**
  - Run `bunx tsc --noEmit`.
- [ ] **Step 4: Commit**
  - `git commit -m "feat(landing): implement engine blueprint and defensible rubric matrix"`

---

### Task 6: Live Shields.io Badge Studio & Atomic PR Remediation Studio

**Files:**
- Create: `components/landing/badge-studio.tsx`
- Create: `components/landing/remediation-studio.tsx`

**Interfaces:**
- Produces: `<BadgeStudio />`, `<RemediationStudio />`

- [ ] **Step 1: Implement `BadgeStudio`**
  - Interactive input for `owner/repo`.
  - Live shields.io badge preview with color thresholds (`brightgreen`, `green`, `yellow`, `orange`, `red`).
  - Copyable Markdown snippet, HTML snippet, and raw `/api/badge/:owner/:repo` JSON preview.
- [ ] **Step 2: Implement `RemediationStudio`**
  - Interactive configuration: License selector (MIT, Apache-2.0, BSD-3-Clause) and runtime stack.
  - Live commit payload preview showing generated tree and blobs.
- [ ] **Step 3: Verify TypeScript compilation**
  - Run `bunx tsc --noEmit`.
- [ ] **Step 4: Commit**
  - `git commit -m "feat(landing): implement shields badge studio and atomic remediation studio"`

---

### Task 7: Developer FAQ, Engineering Footer & Page Assembly

**Files:**
- Create: `components/landing/faq-section.tsx`
- Create: `components/landing/footer.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: Complete new `app/page.tsx`

- [ ] **Step 1: Implement `FaqSection`**
  - Accessible accordion addressing rate limits, AST vs word counts, monorepos, and license choices.
- [ ] **Step 2: Implement `Footer`**
  - Status indicator (`Shields API: Operational`, `Git Tree Engine: 100%`), schema links, GitHub repo link, and copyright.
- [ ] **Step 3: Assemble all components in `app/page.tsx`**
  - Replace the entire landing page with the newly crafted modular components.
- [ ] **Step 4: Verify TypeScript and Linting**
  - Run `bunx tsc --noEmit && bun run lint`.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(landing): assemble redesigned repodoc landing page"`

---

### Task 8: Visual Quality & Cross-Device Verification

**Files:**
- Verify: Full rendered page on Desktop (1440px) and Mobile (375px)

- [ ] **Step 1: Run production build**
  - Run `bun run build`.
- [ ] **Step 2: Start dev server and inspect in browser**
  - Verify layout stability, smooth WebGL canvas rendering, tab switches, and clipboard copy micro-interactions.
- [ ] **Step 3: Fix any visual or functional defects**
- [ ] **Step 4: Final commit**
  - `git commit -m "chore(landing): polish visual craftsmanship, responsive layout, and performance"`
