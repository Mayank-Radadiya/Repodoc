"use client";

import { useCallback, useState } from "react";
import { useScroll, useMotionValueEvent } from "motion/react";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "./resizable-navbar";
import { CandyLink } from "./candy-button";

const NAV_LINKS = [
  { name: "How it works", link: "#how-it-works" },
  { name: "Scoring Rubric", link: "#rubric" },
  { name: "Platform", link: "#features" },
  { name: "Fix Playground", link: "#fix-playground" },
  { name: "FAQ", link: "#faq" },
];

export function LandingNavigation({
  overPhoto = true,
}: {
  overPhoto?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const { scrollY } = useScroll();
  const [onPhoto, setOnPhoto] = useState(overPhoto);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const next = overPhoto && latest <= 100;
    setOnPhoto((prev) => (prev === next ? prev : next));
  });

  const invertedLogo = "[&_.wordmark]:text-white";

  return (
    <Navbar className="fixed inset-x-0 top-0 z-50">
      {/* Desktop */}
      <NavBody className={onPhoto ? invertedLogo : undefined}>
        <NavbarLogo />
        <NavItems
          items={NAV_LINKS}
          className={
            onPhoto
              ? "[&_a]:text-white [&_a:hover]:text-white [&_a>div]:bg-white/20"
              : undefined
          }
        />
        <div className="relative z-20 flex transform-gpu items-center gap-3">
          <CandyLink href="#observatory" className="px-5 py-2 text-sm">
            Explore Audit
          </CandyLink>
        </div>
      </NavBody>

      {/* Mobile */}
      <MobileNav
        className={
          onPhoto
            ? "[&>div:first-child_.wordmark]:text-white [&>div:first-child_button]:text-white"
            : undefined
        }
      >
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle
            isOpen={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          />
        </MobileNavHeader>

        <MobileNavMenu isOpen={mobileOpen} onClose={closeMobile}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.link}
              onClick={closeMobile}
              className="w-full rounded-lg px-3 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005FD6]"
            >
              {link.name}
            </a>
          ))}
          <div className="mt-3 flex w-full flex-col">
            <CandyLink
              href="#observatory"
              className="w-full py-2.5 text-sm"
              onClick={closeMobile}
            >
              Explore Audit
            </CandyLink>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}

export default LandingNavigation;
