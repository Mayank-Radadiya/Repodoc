import type { Metadata } from "next";
import { LandingNavigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { HeroObservatory } from "@/components/landing/hero-observatory";
import { EcosystemStrip } from "@/components/landing/ecosystem-strip";
import { Steps } from "@/components/landing/steps";
import { PlatformBento } from "@/components/landing/platform-bento";
import { Capabilities } from "@/components/landing/capabilities";
import { FixPlayground } from "@/components/landing/fix-playground";
import { FaqSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Repodoc — Repository Intelligence & Automated Health Remediation",
  description:
    "Generate a 100-point repository health audit with defensible evidence, dynamic shields.io badge, and 1-click atomic PR remediation in a single commit.",
  keywords:
    "repository audit, code health, shields.io badge, GitHub automation, repository intelligence, defensible rubric, atomic pull request, git data api, open source hygiene",
  openGraph: {
    type: "website",
    title: "Repodoc — Repository Intelligence & Automated Health Remediation",
    description:
      "Generate a 100-point repository health audit with defensible evidence, dynamic shields.io badge, and 1-click atomic PR remediation in a single commit.",
  },
};

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
