"use client";

import { Menu, ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetPopup,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Brand } from "./brand";
import styles from "./landing.module.css";

export function MobileNav({
  githubUrl,
  fontClassName,
}: {
  githubUrl: string;
  fontClassName: string;
}) {
  return (
    <div className={styles.mobileNav}>
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xl"
              aria-label="Open navigation"
              className={styles.menuButton}
            />
          }
        >
          <Menu size={21} />
        </SheetTrigger>
        <SheetPopup
          className={`${styles.mobilePopup} ${fontClassName}`}
          closeProps={{
            "aria-label": "Close navigation",
            className: styles.closeMenu,
          }}
        >
          <SheetTitle className="sr-only">Repodoc navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Explore features, the workflow, and an interactive sample repository
            audit.
          </SheetDescription>
          <Brand />
          <nav className={styles.mobileLinks} aria-label="Mobile navigation">
            <SheetClose
              nativeButton={false}
              role="link"
              render={<a href="#workflow" />}
            >
              Workflow <ArrowUpRight size={17} />
            </SheetClose>
            <SheetClose
              nativeButton={false}
              role="link"
              render={<a href="#features" />}
            >
              Features <ArrowUpRight size={17} />
            </SheetClose>
            <SheetClose
              nativeButton={false}
              role="link"
              render={<a href="#faq" />}
            >
              FAQ <ArrowUpRight size={17} />
            </SheetClose>
            <SheetClose
              nativeButton={false}
              role="link"
              render={<a href={githubUrl} target="_blank" rel="noreferrer" />}
            >
              GitHub <ArrowUpRight size={17} />
              <span className="sr-only"> (opens in a new tab)</span>
            </SheetClose>
            <SheetClose
              nativeButton={false}
              role="link"
              render={
                <a
                  href="#product-preview"
                  data-preview-view="overview"
                  className={styles.primaryButton}
                />
              }
            >
              Explore sample audit <ArrowRight size={17} />
            </SheetClose>
          </nav>
          <p className={styles.mobileNote}>
            A clear score. A considered next step.
          </p>
        </SheetPopup>
      </Sheet>
    </div>
  );
}
