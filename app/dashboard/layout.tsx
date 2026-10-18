import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthControls } from "@/components/auth/auth-controls";
import styles from "@/components/dashboard/dashboard.module.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.workspace}>
      <a href="#dashboard-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <nav aria-label="Dashboard navigation" className={styles.navigation}>
          <Link href="/" className={styles.brand} aria-label="Repodoc home">
            <Image src="/logo.svg" alt="" width={28} height={28} />
            <span>Repodoc</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/dashboard" aria-current="page">
              Dashboard
            </Link>
            <Link href="/#observatory">Observatory</Link>
          </div>
          <div className={styles.account}>
            <AuthControls />
          </div>
        </nav>
      </header>
      <main id="dashboard-content" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
