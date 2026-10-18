import "server-only";

import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { getGitHubSession } from "@/lib/auth";
import { getDashboardData } from "@/src/lib/dashboard";
import { DashboardView } from "@/components/dashboard";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dashboard - Repodoc",
  description: "Manage your repositories and run one-click health audits.",
};

export default async function DashboardPage() {
  const session = await getGitHubSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  try {
    const data = await getDashboardData(session.accessToken, session.username);
    return <DashboardView initialData={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load dashboard data.";

    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 p-12 text-center">
        <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          Failed to load dashboard
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">{message}</p>
        <Button
          render={<Link href="/dashboard" />}
          className="mt-6 text-xs bg-[#005FD6] text-white hover:bg-[#0051b8]"
        >
          Retry
        </Button>
      </div>
    );
  }
}
