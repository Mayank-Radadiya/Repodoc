"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditRepositoryDialog } from "./audit-dialog";
import { ThemeToggle } from "./theme-toggle";

export function ReportShell({ children }: { children: ReactNode }) {
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setAuditOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#report-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3 focus:shadow-overlay"
      >
        Skip to report
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <nav
          aria-label="Report navigation"
          className="mx-auto flex min-h-16 w-full max-w-[80rem] items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8"
        >
          <Link
            href="/"
            aria-label="Repodoc home"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-md"
          >
            <Image src="/logo.svg" alt="" width={28} height={28} />
            <span className="font-display text-lg font-semibold tracking-tight">
              Repodoc
            </span>
            <span className="hidden rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              v1.0
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setAuditOpen(true)}
            >
              <Search aria-hidden="true" />
              Audit another repository
              <kbd
                aria-hidden="true"
                className="ml-1 hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground lg:inline"
              >
                ⌘K
              </kbd>
            </Button>
          </div>
        </nav>
      </header>
      <main
        id="report-content"
        className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      >
        {children}
      </main>
      <AuditRepositoryDialog open={auditOpen} onOpenChange={setAuditOpen} />
    </div>
  );
}
