import dynamic from "next/dynamic";
import {
  Footer,
  Hero,
  LandingNavigation,
} from "@/components/landing/sections";

/**
 * Below-the-fold sections are code-split with next/dynamic: their HTML is
 * still server-rendered into the static page (first paint and SEO are
 * unchanged), but each section's client JS ships as its own chunk that the
 * browser fetches off the critical path. Only nav + hero stay eager.
 *
 * Import the section modules directly instead of the barrel file — a barrel
 * import would bundle every section into one shared chunk and defeat the
 * split. Loading fallbacks approximate each section's height so hydrating
 * chunks in later does not shift layout.
 */
const HeroObservatory = dynamic(
  () =>
    import("@/components/landing/sections/hero-observatory").then(
      (m) => m.HeroObservatory,
    ),
  { loading: () => <SectionSlot minHeight="44rem" /> },
);

const EcosystemStrip = dynamic(
  () =>
    import("@/components/landing/sections/ecosystem-strip").then(
      (m) => m.EcosystemStrip,
    ),
  { loading: () => <SectionSlot minHeight="12rem" /> },
);

const Steps = dynamic(
  () => import("@/components/landing/sections/steps").then((m) => m.Steps),
  { loading: () => <SectionSlot minHeight="34rem" /> },
);

const PlatformBento = dynamic(
  () =>
    import("@/components/landing/sections/platform-bento").then(
      (m) => m.PlatformBento,
    ),
  { loading: () => <SectionSlot minHeight="46rem" /> },
);

const Capabilities = dynamic(
  () =>
    import("@/components/landing/sections/capabilities").then(
      (m) => m.Capabilities,
    ),
  { loading: () => <SectionSlot minHeight="46rem" /> },
);

const FixPlayground = dynamic(
  () =>
    import("@/components/landing/sections/fix-playground").then(
      (m) => m.FixPlayground,
    ),
  { loading: () => <SectionSlot minHeight="46rem" /> },
);

const FaqSection = dynamic(
  () =>
    import("@/components/landing/sections/faq-section").then(
      (m) => m.FaqSection,
    ),
  { loading: () => <SectionSlot minHeight="38rem" /> },
);

/** Placeholder that reserves a section's vertical space while its chunk loads. */
function SectionSlot({ minHeight }: { minHeight: string }) {
  return <div aria-hidden="true" style={{ minHeight }} />;
}

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>

      {/* Dynamic Resizable Navigation */}
      <LandingNavigation />

      <main id="main-content">
        {/* Hero Section with Scroll Inset Frame */}
        <Hero />

        {/* Interactive Observatory Cockpit */}
        <HeroObservatory />

        {/* Project-Type Manifest Strip */}
        <EcosystemStrip />

        {/* 3-Step Blueprint Grid */}
        <Steps />

        {/* Platform Bento Grid with Animated SVG Circuits */}
        <PlatformBento />

        {/* 6-Card Deep-Tech Capabilities */}
        <Capabilities />

        {/* Interactive Fix-with-PR Playground */}
        <FixPlayground />

        {/* FAQ Accordion */}
        <FaqSection />
      </main>

      {/* Engineering Footer */}
      <Footer />
    </div>
  );
}
