import type { Metadata } from "next";
import { LandingView } from "@/components/landing/landing-view";

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
  return <LandingView />;
}
