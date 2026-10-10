# Landing Page Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the landing page codebase into a clean, modular, maintainable structure with pure data/config separation, typed interfaces, decomposed navbar primitives, modular section directories, and a minimal entry orchestrator.

**Architecture:** Decompose `components/landing/` into four clear layers: `data/` for pure content without JSX, `types/` for shared TypeScript definitions, `ui/` for landing-specific reusable widgets, and `sections/` for domain sections. Complex multi-part views (`hero`, `hero-observatory`, `platform-bento`, `fix-playground`) are broken into focused subcomponents under 150 lines, composed cleanly by `app/page.tsx`.

**Tech Stack:** Next.js 16 (Turbopack, App Router), React 19, Tailwind CSS v4, Motion (motion/react), Lucide React, WebGL (`GridDistortion`).

**Spec:** `docs/superpowers/specs/2026-10-10-landing-page-refactor-design.md`

## Global Constraints

- Preserve all existing designs, responsive behavior, colors, paddings, and styles verbatim.
- Preserve all working interactive states (Observatory 80/100 fixed state toggle, Shields.io copy button feedback, Fix Playground diff selection and projected score calculation, Hero simulated audit scroll).
- Preserve all animations (WebGL GridDistortion background, motion frame scroll-radius inset, spring layout indicators, reduced-motion fallbacks).
- Preserve all accessibility attributes (`aria-label`, `aria-expanded`, `aria-controls`, `role`, skip-to-content links).
- Preserve all in-page anchor IDs (`#main-content`, `#hero`, `#how-it-works`, `#rubric`, `#features`, `#observatory`, `#fix-playground`, `#faq`).
- Every step and task must pass `npm run build` cleanly without type errors or broken references.

---

### Task 1: Type Definitions

**Files:**
- Create: `components/landing/types/index.ts`
- Create: `components/landing/types/report.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: `NavLink`, `AuditMode`, `Ecosystem`, `StepItem`, `CapabilityItem`, `FaqItem`, `FooterLink`, `RecentAudit`, `CategoryId`, `SampleCheck`, `ProposedFile`, `ObservatoryCategory`

- [ ] **Step 1: Create `components/landing/types/index.ts`**

Define all shared landing types:
```typescript
import type { LucideIcon } from "lucide-react";

export interface NavLink {
  name: string;
  link: string;
}

export interface AuditMode {
  id: "audit" | "badge" | "pr";
  label: string;
  Icon: LucideIcon;
}

export interface Ecosystem {
  name: string;
  manifest: string;
  badge: string;
  color: string;
}

export interface StepItem {
  Icon: LucideIcon;
  title: string;
  desc: string;
  badge: string;
  iconClass: string;
}

export interface CapabilityItem {
  icon: LucideIcon;
  title: string;
  desc: string;
  badge: string;
  iconClass: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface RecentAudit {
  repo: string;
  score: string;
  time: string;
  status: "verified" | "fix_ready";
  note: string;
}
```

- [ ] **Step 2: Create `components/landing/types/report.ts`**

Define all audit report, rubric, and playground types:
```typescript
export type CategoryId =
  | "documentation"
  | "hygiene"
  | "testing_ci"
  | "community"
  | "security";

export interface SampleCheck {
  id: string;
  category: CategoryId;
  name: string;
  passed: boolean;
  maxPoints: number;
  path: string;
  evidence: string;
  recommendation: string;
}

export interface ProposedFile {
  path: string;
  lines: string[];
}

export interface ObservatoryCategory {
  name: string;
  score: number;
  max: number;
  color: string;
}

export interface CategorySummary {
  id: CategoryId;
  name: string;
  shortName: string;
  points: number;
  maxPoints: number;
}
```

- [ ] **Step 3: Verify TypeScript Compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/landing/types/
git commit -m "feat(landing): add modular type definitions"
```

---

### Task 2: Pure Data & Content Modules

**Files:**
- Create: `components/landing/data/navigation.ts`
- Create: `components/landing/data/hero.ts`
- Create: `components/landing/data/observatory.ts`
- Create: `components/landing/data/ecosystems.ts`
- Create: `components/landing/data/steps.ts`
- Create: `components/landing/data/bento.ts`
- Create: `components/landing/data/capabilities.ts`
- Create: `components/landing/data/sample-report.ts`
- Create: `components/landing/data/faq.ts`
- Create: `components/landing/data/footer.ts`
- Create: `components/landing/data/index.ts`

**Interfaces:**
- Consumes: Types from `components/landing/types/`
- Produces: `NAV_LINKS`, `AUDIT_MODES`, `SAMPLE_REPOS`, `TRUST_METRICS`, `OBSERVATORY_CATEGORIES`, `ECOSYSTEMS`, `STEPS`, `RUBRIC_WEIGHTS`, `RECENT_AUDITS`, `CAPABILITIES`, `checks`, `sampleScore`, `missingChecks`, `proposedFiles`, `badgeMarkdown`, `FAQ_ITEMS`, `PRODUCT_LINKS`, `RESOURCE_LINKS`

- [ ] **Step 1: Create `data/navigation.ts` and `data/hero.ts`**

In `components/landing/data/navigation.ts`:
```typescript
import type { NavLink } from "../types";

export const NAV_LINKS: NavLink[] = [
  { name: "How it works", link: "#how-it-works" },
  { name: "Scoring Rubric", link: "#rubric" },
  { name: "Platform", link: "#features" },
  { name: "Fix Playground", link: "#fix-playground" },
  { name: "FAQ", link: "#faq" },
];
```

In `components/landing/data/hero.ts`:
```typescript
import { ShieldCheck, Award, GitPullRequest } from "lucide-react";
import type { AuditMode } from "../types";

export const AUDIT_MODES: AuditMode[] = [
  { id: "audit", label: "100-Pt Audit", Icon: ShieldCheck },
  { id: "badge", label: "Shields Badge", Icon: Award },
  { id: "pr", label: "Atomic PR", Icon: GitPullRequest },
];

export const SAMPLE_REPOS = [
  "github.com/facebook/react",
  "github.com/astral-sh/uv",
  "github.com/shadcn-ui/ui",
  "github.com/sample/atlas-cli",
];

export const TRUST_METRICS = [
  "Single-roundtrip Git tree traversal",
  "Defensible v1.0 Rubric",
  "1-Click Atomic PR via Git Data API",
];
```

- [ ] **Step 2: Create `data/observatory.ts`, `data/ecosystems.ts`, and `data/steps.ts`**

In `components/landing/data/observatory.ts`:
```typescript
import type { ObservatoryCategory } from "../types/report";

export const OBSERVATORY_CATEGORIES: ObservatoryCategory[] = [
  { name: "Documentation", score: 25, max: 25, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { name: "Hygiene", score: 15, max: 20, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "Testing & CI", score: 10, max: 25, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "Community", score: 15, max: 15, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { name: "Security", score: 15, max: 15, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];
```

In `components/landing/data/ecosystems.ts`:
```typescript
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
```

In `components/landing/data/steps.ts`:
```typescript
import { FolderTree, ScanSearch, GitPullRequest } from "lucide-react";
import type { StepItem } from "../types";

export const STEPS: StepItem[] = [
  {
    Icon: FolderTree,
    title: "Traverse Tree in 1 Call",
    desc: "Single-call recursive Git tree traversal resolves structure in <1ms",
    badge: "GET /git/trees",
    iconClass: "bg-[#D6EAFF] text-[#005FD6] border-[#A9D3FF]",
  },
  {
    Icon: ScanSearch,
    title: "Defensible Rubric Audit",
    desc: "AST heading parsing & manifest checks across 5 core categories",
    badge: "100-pt Rubric",
    iconClass: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    Icon: GitPullRequest,
    title: "1-Click Atomic PR",
    desc: "Git Data API commits missing hygiene files in one reviewable PR",
    badge: "Atomic Commit",
    iconClass: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
];
```

- [ ] **Step 3: Create `data/bento.ts`, `data/capabilities.ts`, `data/sample-report.ts`, `data/faq.ts`, `data/footer.ts`, and barrel**

In `components/landing/data/bento.ts`:
```typescript
import type { RecentAudit } from "../types";

export const RUBRIC_WEIGHTS = [
  { name: "Documentation (AST Headings)", points: 25, color: "bg-blue-500", text: "text-blue-600" },
  { name: "Testing & Automated CI", points: 25, color: "bg-emerald-500", text: "text-emerald-600" },
  { name: "Project Hygiene & License", points: 20, color: "bg-amber-500", text: "text-amber-600" },
  { name: "Community & Security Baseline", points: 30, color: "bg-purple-500", text: "text-purple-600" },
];

export const RECENT_AUDITS: RecentAudit[] = [
  {
    repo: "facebook/react",
    score: "96/100",
    time: "2m ago",
    status: "verified",
    note: "Clean AST headings, valid LICENSE",
  },
  {
    repo: "astral-sh/uv",
    score: "92/100",
    time: "14m ago",
    status: "verified",
    note: "Cargo manifest detected (Rust CLI)",
  },
  {
    repo: "sample/atlas-cli",
    score: "80/100",
    time: "24m ago",
    status: "fix_ready",
    note: "2 hygiene files ready to commit",
  },
  {
    repo: "vercel/next.js",
    score: "95/100",
    time: "1h ago",
    status: "verified",
    note: "Complete monorepo workflow suite",
  },
];
```

In `components/landing/data/capabilities.ts`:
```typescript
import {
  FolderTree,
  GitPullRequest,
  Zap,
  Award,
  Scale,
  GitBranch,
} from "lucide-react";
import type { CapabilityItem } from "../types";

export const CAPABILITIES: CapabilityItem[] = [
  {
    icon: FolderTree,
    title: "Single-Call Tree Traversal",
    desc: "Resolves 90%+ repository presence checks in a single recursive tree call (GET /git/trees). Executes in-memory lookups in <1ms without N+1 network churn.",
    badge: "1 API Call",
    iconClass: "bg-[#EAF4FF] text-[#005FD6]",
  },
  {
    icon: GitPullRequest,
    title: "Git Data API Orchestration",
    desc: "Constructs atomic multi-file fixes directly via Git Blobs, Trees, and Commits. Opens a single clean PR from an idempotent branch without checkout churn.",
    badge: "Low-Level API",
    iconClass: "bg-[#EAF4FF] text-[#209BFF]",
  },
  {
    icon: Zap,
    title: "HTTP 304 ETag Resiliency",
    desc: "Leverages conditional requests (If-None-Match). Re-auditing unchanged repositories returns 304 Not Modified, consuming zero GitHub rate-limit quota.",
    badge: "0 Quota Hit",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Award,
    title: "Shields.io Dynamic Endpoint",
    desc: "Serves standard Shields.io endpoint JSON directly (/api/badge/[owner]/[repo]), eliminating fragile serverless SVG/canvas rendering bottlenecks.",
    badge: "Schema v1",
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    icon: Scale,
    title: "Legal-Safe License Prompting",
    desc: "Choosing an open-source license is a legal decision. The engine identifies missing licenses and prompts maintainers for explicit SPDX selection.",
    badge: "SPDX Compliant",
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    icon: GitBranch,
    title: "Idempotent Branch Remediation",
    desc: "All automated remediations target repodoc/health-remediation. Subsequent audits cleanly fast-forward the branch rather than spamming duplicate PRs.",
    badge: "Safe Fast-Forward",
    iconClass: "bg-violet-50 text-violet-600",
  },
];
```

In `components/landing/data/sample-report.ts`:
Migrate `checks`, `categoryDefinitions`, `categories`, `sampleScore`, `missingChecks`, `passedChecks`, `projectedScore`, `proposedFiles`, and `badgeMarkdown` from the previous `sample-report.ts` into this data module with proper typings from `../types/report`.

In `components/landing/data/faq.ts`:
```typescript
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
```

In `components/landing/data/footer.ts`:
```typescript
import type { FooterLink } from "../types";

export const PRODUCT_LINKS: FooterLink[] = [
  { label: "Interactive Observatory", href: "#observatory" },
  { label: "Scoring Rubric v1.0", href: "#rubric" },
  { label: "Platform Bento", href: "#features" },
  { label: "Fix Playground", href: "#fix-playground" },
];

export const RESOURCE_LINKS: FooterLink[] = [
  { label: "GitHub Repository", href: "https://github.com/Mayank-Radadiya/Repodoc" },
  { label: "Shields.io Documentation", href: "https://shields.io/badges/endpoint-badge" },
  { label: "SPDX License List", href: "https://spdx.org/licenses/" },
];
```

In `components/landing/data/index.ts`:
Re-export all data modules cleanly.

- [ ] **Step 4: Verify TypeScript Compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add components/landing/data/
git commit -m "feat(landing): extract pure data and content configurations"
```

---

### Task 3: Reusable UI & Navbar Primitives Decomposition

**Files:**
- Create: `components/landing/ui/candy-button.tsx`
- Create: `components/landing/ui/navbar/navbar-root.tsx`
- Create: `components/landing/ui/navbar/nav-body.tsx`
- Create: `components/landing/ui/navbar/nav-items.tsx`
- Create: `components/landing/ui/navbar/mobile-nav.tsx`
- Create: `components/landing/ui/navbar/navbar-logo.tsx`
- Create: `components/landing/ui/navbar/index.ts`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`, types from `components/landing/types/index.ts`
- Produces: `CandyButton`, `CandyLink`, `Navbar`, `NavBody`, `NavItems`, `MobileNav`, `MobileNavHeader`, `MobileNavToggle`, `MobileNavMenu`, `NavbarLogo`

- [ ] **Step 1: Move `CandyButton` and `CandyLink` to `components/landing/ui/candy-button.tsx`**

Move clean implementation with gradient classes and HTML button/anchor attributes.

- [ ] **Step 2: Split `resizable-navbar.tsx` into modular components under `components/landing/ui/navbar/`**

1. `navbar-root.tsx`:
   - Contains `Navbar` with `useScroll` and `useMotionValueEvent` setting `visible` boolean prop on valid children.
2. `nav-body.tsx`:
   - Contains `NavBody` with `motion.div` animated width (`visible ? "64%" : "100%"`), min-width 680px, and surface shadow.
3. `nav-items.tsx`:
   - Contains `NavItems` with hover state and `motion.div layoutId="nav-hovered"`.
4. `mobile-nav.tsx`:
   - Contains `MobileNav`, `MobileNavHeader`, `MobileNavToggle`, and `MobileNavMenu` with `useEffect` window keydown escape listener, body overflow locking, and `AnimatePresence`.
5. `navbar-logo.tsx`:
   - Contains `NavbarLogo` with Next.js `Link`, `Image src="/logo.svg"`, and styled wordmark.
6. `index.ts`:
   - Re-exports all navbar components.

- [ ] **Step 3: Verify TypeScript Compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/landing/ui/
git commit -m "feat(landing): decompose navbar primitives and candy button"
```

---

### Task 4: Hero Section Decomposition

**Files:**
- Create: `components/landing/sections/hero/hero-prompt-card.tsx`
- Create: `components/landing/sections/hero/hero.tsx`
- Create: `components/landing/sections/hero/index.ts`

**Interfaces:**
- Consumes: `AUDIT_MODES`, `SAMPLE_REPOS`, `TRUST_METRICS` from `@/components/landing/data/hero`, `CandyLink` from `@/components/landing/ui/candy-button`, `GridDistortion` from `@/components/GridDistortion`
- Produces: `Hero`, `HeroPromptCard`

- [ ] **Step 1: Create `hero-prompt-card.tsx`**

Extract the interactive repository input field, mode selector pill buttons, and "Run Audit" button with simulated delay and scroll to `#observatory`.
Length: ~85 lines.

- [ ] **Step 2: Create `hero.tsx`**

Render the full-bleed hero container with `motion.section` bottom-radius inset frame, WebGL `GridDistortion` background, eyebrow link pill, Space Grotesk headline, subtitle, `<HeroPromptCard />`, and trust metrics list.
Length: ~110 lines.

- [ ] **Step 3: Create `hero/index.ts`**

Export `Hero` and `HeroPromptCard`.

- [ ] **Step 4: Verify TypeScript Compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/landing/sections/hero/
git commit -m "feat(landing): decompose hero section and prompt card"
```

---

### Task 5: Observatory Section Decomposition

**Files:**
- Create: `components/landing/sections/hero-observatory/score-gauge.tsx`
- Create: `components/landing/sections/hero-observatory/findings-list.tsx`
- Create: `components/landing/sections/hero-observatory/badge-preview.tsx`
- Create: `components/landing/sections/hero-observatory/hero-observatory.tsx`
- Create: `components/landing/sections/hero-observatory/index.ts`

**Interfaces:**
- Consumes: `OBSERVATORY_CATEGORIES` from `@/components/landing/data/observatory`
- Produces: `ScoreGauge`, `FindingsList`, `BadgePreview`, `HeroObservatory`

- [ ] **Step 1: Create `score-gauge.tsx`**

Renders the left cockpit column: sample repo header (`sample/atlas-cli`), circular SVG progress gauge with dashoffset calculation (duration 0.6s with reduced motion fallback), health status label, category points pills, and the "Simulate 1-Click Fix PR (+20 pts)" action button.
Props: `{ fixed: boolean; onToggleFixed: () => void; score: number; badgeColor: string }`.

- [ ] **Step 2: Create `findings-list.tsx`**

Renders the 12-check AST findings list: conditional missing files alerts (`.gitignore` +5 pts, `ci.yml` +15 pts) when unfixed, and passed check cards.
Props: `{ fixed: boolean }`.

- [ ] **Step 3: Create `badge-preview.tsx`**

Renders the Shields.io JSON endpoint code preview block (`/api/badge/sample/atlas-cli`), the live shields.io badge preview, and the markdown clipboard copy button with copied state timeout.
Props: `{ fixed: boolean; score: number; badgeColor: string }`.

- [ ] **Step 4: Create `hero-observatory.tsx` and barrel `index.ts`**

Composes the browser chrome window mockup container, window title bar, and tab navigation between `findings` and `badge` preview, coordinating the state cleanly.
Length: ~90 lines.

- [ ] **Step 5: Verify TypeScript Compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/landing/sections/hero-observatory/
git commit -m "feat(landing): decompose hero observatory cockpit and widgets"
```

---

### Task 6: Platform Bento & Circuit Decomposition

**Files:**
- Create: `components/landing/sections/platform-bento/bento-circuits.tsx`
- Create: `components/landing/sections/platform-bento/bento-cards.tsx`
- Create: `components/landing/sections/platform-bento/platform-bento.tsx`
- Create: `components/landing/sections/platform-bento/index.ts`

**Interfaces:**
- Consumes: `RUBRIC_WEIGHTS`, `RECENT_AUDITS` from `@/components/landing/data/bento`
- Produces: `LineSvg`, `StraightLine`, `PulseBorderIcon`, `RubricCard`, `AuditStreamCard`, `PlatformBento`

- [ ] **Step 1: Move circuit SVGs to `sections/platform-bento/bento-circuits.tsx`**

Contains `LineSvg`, `StraightLine`, and `PulseBorderIcon` with animated SVG gradient filters and pulse keyframes.

- [ ] **Step 2: Create `sections/platform-bento/bento-cards.tsx`**

Extract `RubricCard` (displaying the 4 categories and weights) and `AuditStreamCard` (displaying recent live audits and conditional ETag 304 pill).

- [ ] **Step 3: Create `sections/platform-bento/platform-bento.tsx` and barrel**

Render section header and 3-card bento grid (Card 1: RubricCard, Card 2: AuditStreamCard, Card 3: Atomic Git Data API PR Engine with circuit animation).
Length: ~95 lines.

- [ ] **Step 4: Verify TypeScript Compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/landing/sections/platform-bento/
git commit -m "feat(landing): decompose platform bento cards and circuits"
```

---

### Task 7: Fix Playground Decomposition

**Files:**
- Create: `components/landing/sections/fix-playground/diff-viewer.tsx`
- Create: `components/landing/sections/fix-playground/fix-playground.tsx`
- Create: `components/landing/sections/fix-playground/index.ts`

**Interfaces:**
- Consumes: `missingChecks`, `proposedFiles`, `sampleScore` from `@/components/landing/data/sample-report`
- Produces: `DiffViewer`, `FixPlayground`

- [ ] **Step 1: Create `diff-viewer.tsx`**

Extract the right column: atomic PR metadata card (`repodoc/health-remediation`), file tab selector buttons, and syntax-highlighted diff line renderer with line numbers and green additions.
Length: ~95 lines.

- [ ] **Step 2: Create `fix-playground.tsx`**

Manage selected fixes state, calculate projected score, render the score progress bar, and render the toggle checkboxes. Compose `<DiffViewer />`.
Length: ~110 lines.

- [ ] **Step 3: Create `fix-playground/index.ts`**

Export `FixPlayground`.

- [ ] **Step 4: Verify TypeScript Compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/landing/sections/fix-playground/
git commit -m "feat(landing): decompose fix playground and diff viewer"
```

---

### Task 8: Sections Integration & Clean Single-File Sections

**Files:**
- Create: `components/landing/sections/navigation.tsx`
- Create: `components/landing/sections/ecosystem-strip.tsx`
- Create: `components/landing/sections/steps.tsx`
- Create: `components/landing/sections/capabilities.tsx`
- Create: `components/landing/sections/faq-section.tsx`
- Create: `components/landing/sections/footer.tsx`
- Create: `components/landing/sections/index.ts`

**Interfaces:**
- Consumes: Data from `@/components/landing/data/`, Navbar primitives from `@/components/landing/ui/navbar/`, CandyLink from `@/components/landing/ui/candy-button`
- Produces: `LandingNavigation`, `EcosystemStrip`, `Steps`, `Capabilities`, `FaqSection`, `Footer`

- [ ] **Step 1: Create `sections/navigation.tsx`**

Refactor `LandingNavigation` to import `NAV_LINKS` from `@/components/landing/data/navigation`, navbar primitives from `@/components/landing/ui/navbar`, and `CandyLink` from `@/components/landing/ui/candy-button`.

- [ ] **Step 2: Create `sections/ecosystem-strip.tsx`, `sections/steps.tsx`, and `sections/capabilities.tsx`**

- `ecosystem-strip.tsx`: Import `ECOSYSTEMS` from `@/components/landing/data/ecosystems`.
- `steps.tsx`: Import `STEPS` from `@/components/landing/data/steps`.
- `capabilities.tsx`: Import `CAPABILITIES` from `@/components/landing/data/capabilities`.

- [ ] **Step 3: Create `sections/faq-section.tsx` and `sections/footer.tsx`**

- `faq-section.tsx`: Import `FAQ_ITEMS` from `@/components/landing/data/faq`.
- `footer.tsx`: Import `PRODUCT_LINKS` and `RESOURCE_LINKS` from `@/components/landing/data/footer`.

- [ ] **Step 4: Create `sections/index.ts`**

Clean barrel exporting:
- `LandingNavigation`
- `Hero`
- `HeroObservatory`
- `EcosystemStrip`
- `Steps`
- `PlatformBento`
- `Capabilities`
- `FixPlayground`
- `FaqSection`
- `Footer`

- [ ] **Step 5: Verify TypeScript Compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/landing/sections/
git commit -m "feat(landing): assemble modular sections with decoupled data"
```

---

### Task 9: Main Entry Orchestrator (`app/page.tsx`), Cleanup & Full Verification

**Files:**
- Modify: `app/page.tsx`
- Remove legacy flat landing files from `components/landing/` (`hero.tsx`, `navigation.tsx`, `resizable-navbar.tsx`, etc., replaced by modular structure)

- [ ] **Step 1: Update `app/page.tsx`**

Update imports to pull from `@/components/landing/sections` (or individual section modules). Verify that layout, accessibility skip-link, and section sequence match the original page exactly.

- [ ] **Step 2: Remove obsolete files in `components/landing/` root**

Remove the old flat components that were successfully migrated to `sections/`, `ui/`, and `data/`.
Ensure `components/landing/` only contains:
- `data/`
- `types/`
- `ui/`
- `sections/`
- `index.ts` (optional top-level re-export)

- [ ] **Step 3: Run Full Production Build**

Run: `npm run build`
Expected: Next.js Turbopack build succeeds with 0 errors.

- [ ] **Step 4: Manual/Automated Interaction Verification**

Verify:
- Skip link works.
- Navbar sticky behavior and mobile menu toggle.
- Hero WebGL canvas and scroll inset frame.
- Observatory gauge animation and 80 -> 100 pts simulation button.
- Fix Playground checkboxes and score updates.
- FAQ accordion open/close.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(landing): complete modular architecture refactor"
```
