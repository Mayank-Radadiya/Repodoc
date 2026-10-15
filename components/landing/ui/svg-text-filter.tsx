"use client";

import { useEffect, useRef } from "react";

interface SvgTextFilterProps {
  filterId?: string;
  targetRef?: React.RefObject<HTMLElement | null>;
  maxScale?: number;
  relaxation?: number;
  baseFrequency?: string;
}

export function SvgTextFilter({
  filterId = "dom-grid-distortion",
  targetRef,
  maxScale = 28,
  relaxation = 0.92,
  baseFrequency = "0.02 0.02",
}: SvgTextFilterProps) {
  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement | null>(null);

  useEffect(() => {
    const displacementEl = displacementRef.current;
    const turbulenceEl = turbulenceRef.current;
    if (!displacementEl || !turbulenceEl) return;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduceMotion) return;

    let currentScale = 0;
    let targetScale = 0;
    let time = 0;
    let rafId = 0;
    let lastTime = 0;
    let lastX = 0;
    let lastY = 0;

    const updateFilter = () => {
      displacementEl.setAttribute("scale", currentScale.toFixed(2));
      // Subtle organic wave animation while active
      const freqY = (0.018 + 0.006 * Math.sin(time * 3)).toFixed(4);
      turbulenceEl.setAttribute("baseFrequency", `0.02 ${freqY}`);
    };

    const loop = (now: number) => {
      rafId = 0;
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      time += dt;

      currentScale = currentScale * Math.pow(relaxation, dt * 60) + targetScale * 0.15;
      targetScale *= 0.88;

      if (currentScale < 0.15) {
        currentScale = 0;
        updateFilter();
        lastTime = 0;
        return;
      }

      updateFilter();
      rafId = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (!rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const target = targetRef?.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const clientX = event.clientX;
      const clientY = event.clientY;

      // Distance from mouse to closest point on target bounding box
      const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      const distance = Math.hypot(dx, dy);

      const reach = 160;
      if (distance < reach) {
        const proximity = 1 - distance / reach;
        const speed = Math.hypot(clientX - lastX, clientY - lastY);
        const impulse = Math.min(maxScale, speed * 0.6 + 8) * proximity;
        targetScale = Math.max(targetScale, impulse);
        wake();
      }

      lastX = clientX;
      lastY = clientY;
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = targetRef?.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      if (
        event.clientX >= rect.left - 40 &&
        event.clientX <= rect.right + 40 &&
        event.clientY >= rect.top - 40 &&
        event.clientY <= rect.bottom + 40
      ) {
        // Shockwave ripple on click
        currentScale = Math.min(maxScale * 1.6, currentScale + 22);
        wake();
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [targetRef, maxScale, relaxation, baseFrequency]);

  return (
    <svg
      className="pointer-events-none fixed top-0 left-0 h-0 w-0 opacity-0"
      aria-hidden="true"
    >
      <defs>
        <filter
          id={filterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            ref={turbulenceRef}
            type="fractalNoise"
            baseFrequency={baseFrequency}
            numOctaves={2}
            result="noise"
            seed="2"
          />
          <feDisplacementMap
            ref={displacementRef}
            in="SourceGraphic"
            in2="noise"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

export default SvgTextFilter;
