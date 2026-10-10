# Landing Page Modular Refactor Design

- **Date:** 2026-10-10
- **Status:** Approved
- **Scope:** Refactoring `components/landing/` and `app/page.tsx` for modularity, clean separation of concerns, and maintainability.

---

## 1. Context & Motivation

The Repodoc landing page contains high-fidelity visual and interactive features:
- Interactive WebGL Grid Distortion hero with scroll-responsive radius inset.
- Live repository observatory cockpit with animated SVG circular score gauge and Shields.io JSON/badge endpoint simulator.
- 100-point defensible rubric breakdown and live Git tree stream bento cards.
- Interactive multi-file atomic pull request remediation playground with diff viewer.
- Resizable floating capsule navbar with desktop spring layout indicator and mobile overlay.
- Accessible accordion FAQ and engineering footer.

However, the previous code structure mixed page content, configuration, and stateful widgets in large files with multiple exports (e.g. `resizable-navbar.tsx` had 8 exports, `hero-observatory.tsx` was ~380 lines with mixed concerns, and all text copy was hardcoded into JSX).

This refactoring reorganizes the landing page codebase into a clean, modular structure without changing any user-facing visuals, animations, or interactions.

---

## 2. Architecture & Directory Layout

All landing page code is organized under `components/landing/` into four clear concern areas:

```
components/landing/
├── data/                         # Pure data, copy, and configuration
│   ├── navigation.ts             # Navigation links and labels
│   ├── hero.ts                   # Audit modes, sample repos, trust badges, headlines
│   ├── observatory.ts            # Observatory categories and sample repo metadata
│   ├── ecosystems.ts             # Supported ecosystems and manifest badges
│   ├── steps.ts                  # 3-step workflow items and badges
│   ├── bento.ts                  # Rubric weights & recent audit stream items
│   ├── capabilities.ts           # 6 deep-tech capability items
│   ├── sample-report.ts          # Defensible rubric checks, sample score, proposed files
│   ├── faq.ts                    # FAQ accordion items (questions & answers)
│   └── footer.ts                 # Product links, standard/spec links, copyright info
│
├── types/                        # Dedicated TypeScript interfaces
│   ├── index.ts                  # Shared landing types (Nav, Mode, Ecosystem, Step, Capability, FAQ)
│   └── report.ts                 # Rubric check types, CategoryId, ProposedFile, ObservatoryCategory
│
├── ui/                           # Reusable UI primitives specific to landing
│   ├── candy-button.tsx          # CandyButton & CandyLink
│   └── navbar/                   # Decomposed resizable navbar primitives
│       ├── navbar-root.tsx       # Root motion.nav with scroll visibility detection
│       ├── nav-body.tsx          # Desktop floating capsule container
│       ├── nav-items.tsx         # Hoverable navigation links with spring layoutId
│       ├── mobile-nav.tsx        # Mobile wrapper, header, toggle button, slide-down menu
│       ├── navbar-logo.tsx       # Wordmark and logo link
│       └── index.ts              # Navbar primitives barrel
│
└── sections/                     # Page section components
    ├── navigation.tsx            # LandingNavigation (composing navbar + links + CTA)
    ├── hero/                     # Hero section
    │   ├── hero.tsx              # Full-bleed hero banner & WebGL distortion background
    │   ├── hero-prompt-card.tsx  # Interactive repo input & audit mode pills
    │   └── index.ts              # Hero barrel
    ├── hero-observatory/         # Interactive observatory cockpit
    │   ├── hero-observatory.tsx  # Main observatory frame and tab container
    │   ├── score-gauge.tsx       # Animated SVG circular gauge & category score breakdown
    │   ├── findings-list.tsx     # 12-check AST evidence list & gaps
    │   ├── badge-preview.tsx     # Shields.io endpoint JSON + badge preview with copy
    │   └── index.ts              # Observatory barrel
    ├── ecosystem-strip.tsx       # Context-aware project manifest strip
    ├── steps.tsx                 # 3-step blueprint cards
    ├── platform-bento/           # Platform bento grid
    │   ├── platform-bento.tsx    # Bento layout grid
    │   ├── bento-circuits.tsx    # Animated SVG circuit traces & pulsing icon
    │   ├── bento-cards.tsx       # Rubric weights card & live audit stream card
    │   └── index.ts              # Platform bento barrel
    ├── capabilities.tsx          # 6-card deep-tech capability grid
    ├── fix-playground/           # Remediation lab
    │   ├── fix-playground.tsx    # State orchestrator & score projection card
    │   ├── diff-viewer.tsx       # Atomic PR metadata card & syntax-highlighted diff viewer
    │   └── index.ts              # Fix playground barrel
    ├── faq-section.tsx           # Accessible accordion FAQ
    ├── footer.tsx                # Footer with brand & navigation links
    └── index.ts                  # Sections barrel
```

---

## 3. Data & Content Separation

All hardcoded copy is extracted to `components/landing/data/`:
1. `navigation.ts`: Exports `NAV_LINKS` and CTA config.
2. `hero.ts`: Exports `AUDIT_MODES`, `SAMPLE_REPOS`, `TRUST_METRICS`, and headline copy.
3. `observatory.ts`: Exports `OBSERVATORY_CATEGORIES` and default repo info.
4. `ecosystems.ts`: Exports `ECOSYSTEMS` (TypeScript, Python, Rust, Go, Java, Docker/OCI).
5. `steps.ts`: Exports `STEPS` with icons, titles, descriptions, badges, and icon styling classes.
6. `bento.ts`: Exports `RUBRIC_WEIGHTS` and `RECENT_AUDITS` data arrays.
7. `capabilities.ts`: Exports `CAPABILITIES` 6-item deep-tech items.
8. `sample-report.ts`: Defensible rubric checks (12 checks), scoring logic, and proposed files diff lines.
9. `faq.ts`: Exports `FAQ_ITEMS` (questions, answers).
10. `footer.ts`: Exports `PRODUCT_LINKS`, `RESOURCE_LINKS`, and copyright copy.

---

## 4. Component Decomposition Plan

### 4.1 Navbar Primitives (`components/landing/ui/navbar/`)
- `navbar-root.tsx`: Manages scroll observer via `useScroll` and `useMotionValueEvent`, injecting `visible` state to children.
- `nav-body.tsx`: Animates capsule width and position (`visible ? "64%" : "100%"`).
- `nav-items.tsx`: Handles hovered link state and smooth layout indicator with `layoutId="nav-hovered"`.
- `mobile-nav.tsx`: Contains `MobileNav`, `MobileNavHeader`, `MobileNavToggle`, and `MobileNavMenu` with keyboard escape listener and scroll-lock cleanup.
- `navbar-logo.tsx`: Renders branding logo with Next.js `Image` and styled wordmark.

### 4.2 Hero Section (`components/landing/sections/hero/`)
- `hero.tsx`: Section container with `motion.section` scroll-based border-radius inset, WebGL `GridDistortion` background, eyebrow pill, headline, and trust metrics.
- `hero-prompt-card.tsx`: Handles target repository input, audit mode switcher, and "Run Audit" button with simulated delay and smooth-scroll to `#observatory`.

### 4.3 Observatory Cockpit (`components/landing/sections/hero-observatory/`)
- `hero-observatory.tsx`: Chrome browser mockup frame with URL bar and tab switching between findings and badge API.
- `score-gauge.tsx`: Renders circular SVG progress gauge with reduced-motion support, health status text, category score list, and the "Simulate 1-Click Fix PR" toggle button.
- `findings-list.tsx`: AST parsed evidence list, missing check alerts (+5, +15 pts), and passed checks.
- `badge-preview.tsx`: Shields.io GET response code block, live shields.io badge preview, and markdown clipboard copy button with timeout feedback.

### 4.4 Platform Bento (`components/landing/sections/platform-bento/`)
- `platform-bento.tsx`: Layout grid and section header.
- `bento-cards.tsx`: 100-Point Rubric breakdown card and live Git tree stream card with conditional caching ping indicator.
- `bento-circuits.tsx`: Pure animated SVG circuit paths (`LineSvg`, `StraightLine`) and glowing central node (`PulseBorderIcon`).

### 4.5 Fix Playground (`components/landing/sections/fix-playground/`)
- `fix-playground.tsx`: Score projection header, animated score climb, progress bar, and missing check checkboxes.
- `diff-viewer.tsx`: Atomic commit metadata pill (`repodoc/health-remediation`), diff tab switcher, and syntax-highlighted git diff lines.

### 4.6 Standalone Clean Sections
- `ecosystem-strip.tsx`: Manifest badges.
- `steps.tsx`: 3-step blueprint cards with dashed border accents.
- `capabilities.tsx`: 6 deep-tech capability cards with dashed border accents.
- `faq-section.tsx`: Accessible accordion with rotate indicator and height animation.
- `footer.tsx`: Engineering footer with brand and links.

---

## 5. Main Entry File (`app/page.tsx`)

`app/page.tsx` will be a minimal orchestrator:
- Imports all sections from `@/components/landing/sections`.
- Renders the skip-to-content accessibility link.
- Composes `LandingNavigation`, `main` section containers, and `Footer`.
- Preserves full Next.js page `metadata`.

---

## 6. Non-Regression & Quality Checklist

1. **Accessibility**: All `aria-label`, `aria-expanded`, `aria-controls`, `role`, and skip-to-content links remain active.
2. **Anchor Navigation**: Anchor IDs (`#hero`, `#how-it-works`, `#rubric`, `#features`, `#observatory`, `#fix-playground`, `#faq`, `#main-content`) are identical.
3. **Animations**: Framer Motion transforms, spring transitions, WebGL distortion background, and reduced-motion checks work identically.
4. **TypeScript**: Clean compilation via `npm run build` with Turbopack, no circular dependencies, zero lint warnings.
