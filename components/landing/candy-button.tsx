import React from "react";
import { cn } from "@/lib/utils";

const candyButtonClasses = cn(
  "relative text-white font-semibold text-base leading-[22px] tracking-[0.02em]",
  "px-8 py-3 rounded-xl cursor-pointer transition duration-150 ease-out",
  "border border-[#54A1FD] bg-[radial-gradient(95%_60%_at_50%_75%,#005FD6_0%,#209BFF_100%)]",
  "shadow-[0px_4px_48px_-12px_#1187FF,inset_0px_1px_8px_-4px_#FFFFFF]",
  "active:scale-[0.97]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
  "after:absolute after:top-[1px] after:right-[10%] after:w-[60%] after:h-[1px]",
  "after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent",
  "hover:brightness-110",
);

export type CandyButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function CandyButton({
  className,
  children = "Candy Button",
  ...props
}: CandyButtonProps) {
  return (
    <button className={cn(candyButtonClasses, className)} {...props}>
      {children}
    </button>
  );
}

export type CandyLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

export function CandyLink({ className, children, ...props }: CandyLinkProps) {
  return (
    <a
      className={cn(
        candyButtonClasses,
        "inline-flex items-center justify-center text-center",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export default CandyButton;
