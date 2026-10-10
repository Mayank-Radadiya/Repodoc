"use client";

import { useId } from "react";
import { GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";

export const LineSvg = ({
  className,
  delay = 0,
  color = "#005FD6",
}: {
  className: string;
  delay?: number;
  color?: string;
}) => {
  const glowId = useId();
  return (
    <svg
      width="312"
      height="33"
      viewBox="0 0 312 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("absolute overflow-visible", className)}
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M0.5 1 H311.5 V32"
        stroke="#e2e8f0"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M0.5 1 H311.5 V32"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="24 366"
        filter={`url(#${glowId})`}
        style={{
          animation: `line-pulse-travel-corner 2.6s linear ${delay}s infinite`,
        }}
      />
    </svg>
  );
};

export const StraightLine = ({
  className,
  delay = 0,
  color = "#209BFF",
}: {
  className: string;
  delay?: number;
  color?: string;
}) => {
  const glowId = useId();
  return (
    <svg
      width="312"
      height="2"
      viewBox="0 0 312 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("absolute overflow-visible", className)}
    >
      <defs>
        <filter
          id={glowId}
          filterUnits="userSpaceOnUse"
          x="-10"
          y="-10"
          width="332"
          height="22"
        >
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M0.5 1 H311.5"
        stroke="#e2e8f0"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M0.5 1 H311.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="24 335"
        filter={`url(#${glowId})`}
        style={{
          animation: `line-pulse-travel-straight 2.6s linear ${delay}s infinite`,
        }}
      />
    </svg>
  );
};

export const PulseBorderIcon = ({ className }: { className?: string }) => {
  const glowId = useId();
  return (
    <div className={cn("absolute size-14", className)}>
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        className="absolute inset-0 overflow-visible"
      >
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect
          x="0.5"
          y="0.5"
          width="55"
          height="55"
          rx="6"
          stroke="#e2e8f0"
          strokeWidth="1"
          fill="none"
        />
        <rect
          x="0.5"
          y="0.5"
          width="55"
          height="55"
          rx="6"
          stroke="#005FD6"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="20 200"
          filter={`url(#${glowId})`}
          style={{
            animation: "border-ring-pulse 3s linear infinite",
          }}
        />
        <rect
          x="0.5"
          y="0.5"
          width="55"
          height="55"
          rx="6"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="20 200"
          filter={`url(#${glowId})`}
          style={{
            animation: "border-ring-pulse 3s linear infinite",
            animationDelay: "-1.5s",
          }}
        />
      </svg>
      <div className="absolute inset-1 flex items-center justify-center rounded-md bg-white shadow-xs">
        <GitPullRequest size={22} className="text-[#005FD6]" />
      </div>
    </div>
  );
};
