import Link from "next/link";
import Image from "next/image";

export const NavbarLogo = () => {
  return (
    <Link
      href="/"
      aria-label="Repodoc home"
      className="relative z-20 mr-4 flex shrink-0 transform-gpu items-center gap-2.5 rounded-lg px-2 py-1 text-sm font-normal"
    >
      <Image src="/logo.svg" alt="Repodoc" width={32} height={32} />
      <span className="wordmark font-display text-lg font-bold tracking-tight text-slate-900 transition-colors md:text-xl">
        Repodoc
      </span>
    </Link>
  );
};
