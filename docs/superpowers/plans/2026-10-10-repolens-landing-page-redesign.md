# RepoLens Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely redesign the RepoLens landing page to achieve the visual fidelity, interaction craft, typography, responsive behavior, and component architecture of `DaemonDoc/seo-client`, tailored to RepoLens's repository auditing, health scoring, and 1-click atomic PR remediation.

**Architecture:** Component modularization following DaemonDoc's patterns: dynamic resizable capsule navbar with spring transitions, scroll-driven hero frame with background panel, interactive repository audit input bar, live audit observatory, 3-step blueprint grid with dashed crosslines, interactive platform bento grid with glowing SVG circuits (`LineSvg`, `StraightLine`, `PulseBorderIcon`), 6-card capabilities grid, interactive fix playground, animated FAQ accordions, and polished footer.

**Tech Stack:** Next.js 16.4 (App Router, Turbopack), React 19, Tailwind CSS v4, `motion/react`, `lucide-react`, `Space_Grotesk` + `Inter` + `Geist_Mono`.

**Spec:** `docs/superpowers/specs/2026-10-10-repolens-landing-page-redesign.md`

## Global Constraints
- Target project uses Next.js 16.4 App Router and Tailwind CSS v4.
- Use `motion/react` (or `framer-motion`) with `useReducedMotion()` checks for accessibility.
- Preserve existing working data models (`components/landing/sample-report.ts`).
- Avoid generic AI gradients or unnecessary clutter; maintain clean typography, crisp borders, and subtle elevation shadows.
- All code must pass `bun run lint` and `bun run build`.

---

### Task 1: Design Tokens, CSS Animations & Layout Fonts

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update `app/layout.tsx` to include `Space_Grotesk` and `Inter` variables**
  Configure `Space_Grotesk` as `--font-space-grotesk` and `Inter` as `--font-inter`.

- [ ] **Step 2: Add DaemonDoc elevation tokens, typography rules & SVG pulse keyframes to `app/globals.css`**
  Add `@theme` elevation tokens (`--shadow-card`, `--shadow-raised`, `--shadow-overlay`), heading optical letter-spacing, focus-visible styles, and keyframes:
  - `line-pulse-travel-corner`
  - `line-pulse-travel-straight`
  - `border-ring-pulse`
  - `pulse-slow-anim`

- [ ] **Step 3: Verify build and styling**
  Run: `bun run build`
  Expected: Compiled successfully with zero errors.

- [ ] **Step 4: Commit**
  ```bash
  git add app/layout.tsx app/globals.css
  git commit -m "feat(landing): configure design tokens, fonts, and animation keyframes"
  ```

---

### Task 2: Core Primitives — CandyButton and ResizableNavbar

**Files:**
- Create: `components/landing/candy-button.tsx`
- Create: `components/landing/resizable-navbar.tsx`

- [ ] **Step 1: Implement `CandyButton` and `CandyLink`**
  Create `components/landing/candy-button.tsx` with radial gradient (`#005FD6` to `#209BFF`), top specular highlight pseudo-element, glowing drop shadow, and active press scale.

- [ ] **Step 2: Implement `ResizableNavbar` and subcomponents**
  Create `components/landing/resizable-navbar.tsx` with:
  - `Navbar`: listens to `useScroll()` > 100px threshold.
  - `NavBody`: animates width between `100%` and `60%` (or fixed `min-w-[720px]`), y translation, and surface card shadow.
  - `NavItems`: sliding hover capsule with `layoutId="nav-hovered"`.
  - `MobileNav`: toggle button with hamburger/X and animated sheet with escape key listener and body scroll lock.

- [ ] **Step 3: Verify compilation**
  Run: `bun run lint`
  Expected: No errors.

- [ ] **Step 4: Commit**
  ```bash
  git add components/landing/candy-button.tsx components/landing/resizable-navbar.tsx
  git commit -m "feat(landing): add CandyButton and ResizableNavbar primitives"
  ```

---

### Task 3: Hero Section & Interactive Repository Audit Bar

**Files:**
- Create: `components/landing/hero.tsx`

- [ ] **Step 1: Implement `Hero` with scroll-driven frame and interactive audit prompt**
  - Use `useScroll` with `useTransform` to animate bottom border radius (`0` to `32px`) and horizontal margins (`0` to `14px`).
  - Full-bleed background with `public/landing/repository-landscape.png` and radial scrims.
  - Eyebrow pill: *"Single-roundtrip Git tree traversal — 100-point defensible audit"*.
  - Headline in Space Grotesk: *"From git clone to defensible audit in seconds."*
  - Dark glass interactive prompt bar (`bg-slate-950/90`, `ring-1 ring-white/40`) with simulated repository input, mode pills (*Full Audit*, *Atomic PR*, *Shield Badge*), and instant CandyLink CTA.

- [ ] **Step 2: Verify component rendering and lint**
  Run: `bun run lint`
  Expected: Clean pass.

- [ ] **Step 3: Commit**
  ```bash
  git add components/landing/hero.tsx
  git commit -m "feat(landing): implement Hero with scroll frame and audit prompt bar"
  ```

---

### Task 4: Observatory Demo & Manifest Awareness Strip

**Files:**
- Create: `components/landing/hero-observatory.tsx`
- Create: `components/landing/ecosystem-strip.tsx`

- [ ] **Step 1: Implement `HeroObservatory`**
  - macOS browser window chrome with traffic lights and `repolens.dev/report/atlas-cli` address bar.
  - Interactive health gauge displaying 80/100 score, categorized breakdown pills, and shields.io badge preview snippet.
  - Quick action buttons to toggle rubric views.

- [ ] **Step 2: Implement `EcosystemStrip`**
  - Clean cards showing supported language manifests (TypeScript, Rust, Python, Go, Java, Docker).
  - Clarifying note: *"RepoLens adapts to project types: libraries are never penalized for missing application files."*

- [ ] **Step 3: Verify lint and build**
  Run: `bun run lint`
  Expected: Zero errors.

- [ ] **Step 4: Commit**
  ```bash
  git add components/landing/hero-observatory.tsx components/landing/ecosystem-strip.tsx
  git commit -m "feat(landing): add HeroObservatory and EcosystemStrip components"
  ```

---

### Task 5: 3-Step Blueprint Grid with Dashed Crosslines

**Files:**
- Create: `components/landing/steps.tsx`

- [ ] **Step 1: Implement `Steps`**
  - Section with ID `how-it-works`.
  - 3 blueprint cards with dashed crosslines (`border border-dashed border-neutral-200` extending beyond card bounds):
    1. *Single-Call Tree Traversal* (`GET /git/trees/{sha}?recursive=1` in <1ms).
    2. *Defensible Rubric Audit* (AST heading parser and structural evidence).
    3. *1-Click Atomic PR* (Git Data API blobs, trees, commit on idempotent branch).
  - Hover state enhancements with smooth shadow and icon transitions.

- [ ] **Step 2: Verify lint**
  Run: `bun run lint`
  Expected: Zero errors.

- [ ] **Step 3: Commit**
  ```bash
  git add components/landing/steps.tsx
  git commit -m "feat(landing): implement 3-Step Blueprint Grid with dashed crosslines"
  ```

---

### Task 6: Platform Bento Grid with Animated SVG Circuits

**Files:**
- Create: `components/landing/platform-bento.tsx`
- Create: `components/landing/bento-circuits.tsx`

- [ ] **Step 1: Implement SVG circuit primitives in `bento-circuits.tsx`**
  - `LineSvg`: SVG path with linear gradient glow filter and animated stroke-dasharray pulse.
  - `StraightLine`: Horizontal straight SVG line with glowing pulse traveling along it.
  - `PulseBorderIcon`: Center processor box with dual glowing pulsing outline rings.

- [ ] **Step 2: Implement `PlatformBento`**
  - Section `features` with subtitle *"Platform: Low-level Git Data API. Defensible Scoring."*
  - Card 1: *100-Point Scoring Rubric & Weights* (with AST heading verification tags and points).
  - Card 2: *Real-time Git Audit Stream* (live audit checks with success/warning chips and pulsating indicator).
  - Card 3 (2 cols wide): *Atomic Git Data API PR Engine* with the animated SVG circuits connecting input file generators into the central commit engine.

- [ ] **Step 3: Verify lint and build**
  Run: `bun run build`
  Expected: Clean compilation with Turbopack.

- [ ] **Step 4: Commit**
  ```bash
  git add components/landing/bento-circuits.tsx components/landing/platform-bento.tsx
  git commit -m "feat(landing): implement Platform Bento Grid with animated SVG circuits"
  ```

---

### Task 7: Core Capabilities & Interactive Fix Playground

**Files:**
- Update: `components/landing/capabilities.tsx`
- Update: `components/landing/fix-playground.tsx`

- [ ] **Step 1: Update `capabilities.tsx` to 6-card blueprint style**
  - 6 engineering cards with dashed corner crosslines:
    1. *Single-Call Tree Traversal*
    2. *Low-Level Git Data API*
    3. *ETag Conditional Caching (304)*
    4. *Shields.io Dynamic Endpoint*
    5. *Legal-Safe License Selection*
    6. *Idempotent Branching (`repodoc/health-remediation`)*

- [ ] **Step 2: Modernize `fix-playground.tsx` with DaemonDoc card styling**
  - Interactive selection of `.gitignore` and `ci.yml` fixes.
  - Live diff viewer showing atomic commit generation.
  - Interactive score update jumping from 80/100 to 100/100.

- [ ] **Step 3: Verify lint**
  Run: `bun run lint`
  Expected: Zero errors.

- [ ] **Step 4: Commit**
  ```bash
  git add components/landing/capabilities.tsx components/landing/fix-playground.tsx
  git commit -m "feat(landing): adapt capabilities and fix playground to blueprint styling"
  ```

---

### Task 8: FAQ Accordion & Polished Engineering Footer

**Files:**
- Create: `components/landing/faq-section.tsx`
- Create: `components/landing/footer.tsx`

- [ ] **Step 1: Implement `faq-section.tsx`**
  - 5-col / 7-col split layout matching DaemonDoc.
  - Accordion with Motion `AnimatePresence`, smooth height transitions, and animated plus/minus indicator.
  - Answers specific to RepoLens (tree traversal, license compliance, shields endpoint, etc.).

- [ ] **Step 2: Implement `footer.tsx`**
  - Clean footer with RepoLens branding, rubric version indicator, navigation links, and GitHub link.

- [ ] **Step 3: Verify lint**
  Run: `bun run lint`
  Expected: Zero errors.

- [ ] **Step 4: Commit**
  ```bash
  git add components/landing/faq-section.tsx components/landing/footer.tsx
  git commit -m "feat(landing): implement FAQ accordion and engineering footer"
  ```

---

### Task 9: Assemble Landing Page, Verify & Visual Testing

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Assemble all sections in `app/page.tsx`**
  Compose:
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

- [ ] **Step 2: Run full build and lint check**
  Run: `bun run lint && bun run build`
  Expected: Zero lint warnings or errors, successful static page generation.

- [ ] **Step 3: Run dev server and test responsive rendering**
  - Run dev server on port 3000.
  - Verify desktop (1440px) and mobile (375px) viewports for layout stability, absence of horizontal overflow, and proper animation execution.

- [ ] **Step 4: Commit final landing page assembly**
  ```bash
  git add app/page.tsx
  git commit -m "feat(landing): complete redesign of RepoLens landing page based on DaemonDoc"
  ```
