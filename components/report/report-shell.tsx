import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./report.module.css";

export function ReportShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.workspace}>
      <a
        href="#report-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to report
      </a>
      <header className={styles.navigation}>
        <nav
          aria-label="Report navigation"
          className={`${styles.container} flex min-h-20 items-center justify-between gap-4 py-4`}
        >
          <Link
            href="/"
            aria-label="Repodoc home"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-md"
          >
            <Image src="/logo.svg" alt="" width={28} height={28} />
            <span className="font-display text-xl font-bold tracking-tight">
              Repodoc
            </span>
          </Link>
          <Link
            href="/#hero"
            className={`${styles.link} inline-flex min-h-11 items-center rounded-md text-right text-sm font-medium`}
          >
            Audit another repository
          </Link>
        </nav>
      </header>
      <main id="report-content" className={`${styles.container} py-8 sm:py-12`}>
        {children}
      </main>
    </div>
  );
}
