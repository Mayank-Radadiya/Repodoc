import React from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthControls } from "@/components/auth/auth-controls";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Skip to main content for accessibility */}
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
              aria-label="Repodoc Home"
            >
              <Image src="/logo.svg" alt="" width={28} height={28} />
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Repodoc
              </span>
            </Link>

            <nav className="hidden items-center gap-4 sm:flex">
              <Link
                href="/dashboard"
                className="rounded-lg px-2.5 py-1 text-sm font-medium text-[#005FD6] bg-blue-50/80"
              >
                Dashboard
              </Link>
              <Link
                href="/#observatory"
                className="rounded-lg px-2.5 py-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Observatory
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <AuthControls />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        id="dashboard-content"
        className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        {children}
      </main>
    </div>
  );
}
