import "server-only";

import React from "react";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { getGitHubSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { DashboardView } from "@/components/dashboard";
import { DashboardRetry } from "@/components/dashboard/dashboard-retry";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata = {
  title: "Dashboard - Repodoc",
  description: "Manage your repositories and run one-click health audits.",
};

export default async function DashboardPage() {
  const session = await getGitHubSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  let data;
  let loadError: string | null = null;

  try {
    data = await getDashboardData(session.accessToken, session.username);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load dashboard data.";
  }

  if (loadError || !data) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <AlertCircle size={24} aria-hidden="true" />
        </div>
        <h1>Failed to load dashboard</h1>
        <p>{loadError ?? "Unable to load dashboard data."}</p>
        <DashboardRetry />
      </div>
    );
  }

  return <DashboardView initialData={data} />;
}
