"use client";

// Temporary visual QA fixture. Removed before production verification.
import { useState } from "react";
import DashboardLayout from "../dashboard/layout";
import DashboardLoading from "../dashboard/loading";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { sampleDashboardData, auditResponse } from "@/components/dashboard/__tests__/fixtures";
import { DashboardRetry } from "@/components/dashboard/dashboard-retry";

export default function Preview() {
  const [scenario, setScenario] = useState("default");
  const repos = scenario === "empty" ? [] : sampleDashboardData.repositories.map((repo) => scenario === "long" ? {
    ...repo, name: `${repo.name}-a-very-long-repository-name-with-no-natural-short-version`,
    description: "A repository with a long description to verify that detailed product content wraps predictably on small screens and remains readable.",
    defaultBranch: "feature/a-very-long-branch-name-without-any-whitespace-for-layout-validation",
  } : scenario === "no-audits" ? { ...repo, hasReport: false, healthScore: null, lastAuditedAt: null } : repo);
  return <>
    <div style={{ padding: 8, fontSize: 12, background: "#fff" }}><label>QA scenario <select value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="default">Default</option><option value="empty">Empty</option><option value="no-audits">No audits</option><option value="long">Long content</option><option value="loading">Loading</option><option value="retry">Retry</option></select></label></div>
    <DashboardLayout>{scenario === "loading" ? <DashboardLoading /> : scenario === "retry" ? <DashboardRetry /> : <DashboardView key={scenario} initialData={{ ...sampleDashboardData, repositories: repos }} fetcher={async (_input, init) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const { repo: name } = JSON.parse(String(init?.body));
      const repo = repos.find((item) => item.name === name)!;
      return auditResponse(repo, 95);
    }} />}</DashboardLayout>
  </>;
}
