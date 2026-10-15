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
  id?: "traverse" | "evaluate" | "remediate";
  stepNumber?: string;
  stepEyebrow?: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
  badge: string;
  iconClass: string;
  method?: "GET" | "AUDIT" | "POST";
  endpoint?: string;
  latencyBenchmark?: string;
  metricValue?: string;
  metricLabel?: string;
  highlights?: string[];
  payloadSummary?: string;
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
