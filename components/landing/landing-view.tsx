"use client";

import { useState } from "react";
import { LandingNavigation } from "./navigation";
import { Hero } from "./hero";
import { DualInspector } from "./dual-inspector";
import { EngineBlueprint } from "./engine-blueprint";
import { RubricMatrix } from "./rubric-matrix";
import { BadgeStudio } from "./badge-studio";
import { RemediationStudio } from "./remediation-studio";
import { FaqSection } from "./faq-section";
import { Footer } from "./footer";
import { SAMPLE_REPOS_PROFILES } from "./sample-report";
import { RepoAuditProfile } from "./types";

export function LandingView() {
  const [selectedRepo, setSelectedRepo] = useState<RepoAuditProfile>(
    SAMPLE_REPOS_PROFILES[0]
  );

  return (
    <div className="relative min-h-screen bg-[#06080d] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-slate-950 font-medium"
      >
        Skip to main content
      </a>

      {/* Sticky Translucent Engineering Navigation */}
      <LandingNavigation />

      <main id="main-content" className="relative">
        {/* Hero Section with WebGL ReflectShader Canvas & Command Bar */}
        <Hero selectedRepo={selectedRepo} onSelectRepo={setSelectedRepo} />

        {/* Centerpiece Dual-Mode Cockpit (Audit Diagnostics & Atomic Git Diff) */}
        <DualInspector selectedRepo={selectedRepo} />

        {/* 3-Step Low-Level Git Engine Blueprint */}
        <EngineBlueprint />

        {/* 100-Point Defensible Rubric Matrix */}
        <RubricMatrix />

        {/* Live Shields.io Badge Studio */}
        <BadgeStudio />

        {/* 1-Click Atomic PR Remediation Studio */}
        <RemediationStudio />

        {/* Developer Truths & FAQ Accordion */}
        <FaqSection />
      </main>

      {/* Engineering Footer */}
      <Footer />
    </div>
  );
}
