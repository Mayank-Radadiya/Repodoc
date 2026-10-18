"use client";

// Temporary fixture for responsive visual verification; removed before delivery.
import { useState } from "react";
import { Copy, GitPullRequest, RefreshCw, Share2 } from "lucide-react";
import { checks } from "@/components/landing/data/sample-report";
import { ReportView } from "@/components/report/report-view";
import { ReportShell } from "@/components/report/report-shell";
import { ReportThemeScope } from "@/components/report/theme-scope";
import { ReportPending } from "@/components/report/report-pending";
import { ReportErrorCard } from "@/components/report/report-error-card";
import { Button } from "@/components/ui/button";
import type { AuditReport } from "@/src/lib/types";

const base: AuditReport = {
  owner: "acme", repo: "orbit-cli", defaultBranch: "main", rubricVersion: "1.0.0",
  healthScore: 65, generatedAt: "2026-10-18T10:30:00.000Z",
  checks: checks.map((check) => ({
    id: check.id, name: check.name, category: check.category,
    passed: !["ci-workflow", "gitignore", "security-policy", "dependency-updates"].includes(check.id),
    maxPoints: check.maxPoints,
    pointsAwarded: ["ci-workflow", "gitignore", "security-policy", "dependency-updates"].includes(check.id) ? 0 : check.maxPoints,
    evidence: { found: check.passed, filesChecked: [check.path], details: check.evidence },
    remediation: { canAutomate: true, targetPath: check.path, description: check.recommendation },
  })),
};
export default function Preview() {
  const [scenario, setScenario] = useState("default");
  const report = scenario === "empty" ? { ...base, checks: [], healthScore: 0 }
    : scenario === "passed" ? { ...base, checks: base.checks.map((check) => ({ ...check, passed: true, pointsAwarded: check.maxPoints })), healthScore: 100 }
    : scenario === "long" ? { ...base, owner: "organization-with-a-very-long-name", repo: "repository-with-an-unusually-long-name-for-responsive-validation", defaultBranch: "feature/a-long-branch-without-any-whitespace-for-responsive-layout-checks", checks: base.checks.map((check) => ({ ...check, name: check.name + " with additional repository configuration details", evidence: { ...check.evidence, details: check.evidence.details + " " + "verylongfilepathwithoutwhitespace/".repeat(10), filesChecked: ["long-directory-name/".repeat(12) + "config.yml"] } })) }
    : base;
  return <ReportThemeScope><div style={{ padding: 8 }}><label>QA scenario <select value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="default">Default</option><option value="long">Long content</option><option value="empty">Empty</option><option value="passed">Passed</option><option value="loading">Loading</option><option value="error">Error</option><option value="shared">Shared</option></select></label></div><ReportShell>
    {scenario === "loading" ? <ReportPending /> : scenario === "error" ? <ReportErrorCard error="Unable to reach GitHub. Try the audit again." onRetry={() => setScenario("default")} /> : <ReportView key={scenario} report={report} baseUrl="http://localhost:3000" actions={scenario === "shared" ? <><Button variant="outline"><Copy />Copy share link</Button><Button variant="outline">View live report</Button></> : <><Button><GitPullRequest />Fix with pull request</Button><Button variant="outline"><RefreshCw />Re-audit</Button><Button variant="outline"><Share2 />Share link</Button><Button variant="outline"><Copy />Copy report link</Button></>} feedback={scenario === "shared" ? <p>Shared snapshot (read-only)</p> : undefined} />}
  </ReportShell></ReportThemeScope>;
}
