import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  ScoreGauge,
  BADGE_COLOR_PALETTE,
  normalizeScore,
  getScoreGaugePalette,
} from "@/components/report/score-gauge";

describe("ScoreGauge Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Acceptance Criteria: Rendering correct score and color", () => {
    const testCases = [
      {
        score: 0,
        expectedColor: "red" as const,
        expectedHex: BADGE_COLOR_PALETTE.red.hex,
        expectedLabel: "Critical",
      },
      {
        score: 45,
        expectedColor: "orange" as const,
        expectedHex: BADGE_COLOR_PALETTE.orange.hex,
        expectedLabel: "Needs Improvement",
      },
      {
        score: 62,
        expectedColor: "yellow" as const,
        expectedHex: BADGE_COLOR_PALETTE.yellow.hex,
        expectedLabel: "Fair",
      },
      {
        score: 78,
        expectedColor: "green" as const,
        expectedHex: BADGE_COLOR_PALETTE.green.hex,
        expectedLabel: "Good",
      },
      {
        score: 95,
        expectedColor: "brightgreen" as const,
        expectedHex: BADGE_COLOR_PALETTE.brightgreen.hex,
        expectedLabel: "Excellent",
      },
    ];

    testCases.forEach(({ score, expectedColor, expectedHex, expectedLabel }) => {
      it(`renders score ${score} with badge color "${expectedColor}" and stroke "${expectedHex}"`, () => {
        const { container } = render(<ScoreGauge score={score} showStatus={true} />);

        const gauge = screen.getByRole("meter");
        expect(gauge).toBeDefined();
        expect(gauge.getAttribute("data-score")).toBe(String(score));
        expect(gauge.getAttribute("data-badge-color")).toBe(expectedColor);
        expect(gauge.getAttribute("data-color")).toBe(expectedColor);
        expect(gauge.getAttribute("aria-valuenow")).toBe(String(score));

        // Score readout inside the gauge
        const scoreValue = screen.getByTestId("score-value");
        expect(scoreValue.textContent).toBe(String(score));

        const scoreMax = screen.getByTestId("score-max");
        expect(scoreMax.textContent).toBe("/ 100");

        // Status descriptor text
        const statusEl = screen.getByTestId("score-status");
        expect(statusEl.textContent).toBe(expectedLabel);

        // SVG progress indicator circle
        const indicator = container.querySelector('[data-slot="gauge-indicator"]');
        expect(indicator).toBeDefined();
        expect(indicator?.getAttribute("stroke")).toBe(expectedHex);
        expect(indicator?.getAttribute("data-badge-color")).toBe(expectedColor);
      });
    });
  });

  describe("Color Threshold Boundaries", () => {
    it.each([
      [0, "red"],
      [39, "red"],
      [40, "orange"],
      [59, "orange"],
      [60, "yellow"],
      [74, "yellow"],
      [75, "green"],
      [89, "green"],
      [90, "brightgreen"],
      [99, "brightgreen"],
      [100, "brightgreen"],
    ] as const)("assigns score %i to badge color %s", (score, expectedColor) => {
      render(<ScoreGauge score={score} />);
      const gauge = screen.getByRole("meter");
      expect(gauge.getAttribute("data-badge-color")).toBe(expectedColor);
      expect(gauge.getAttribute("data-color")).toBe(expectedColor);
    });
  });

  describe("Input Normalization & Edge Cases", () => {
    it("clamps negative scores to 0", () => {
      render(<ScoreGauge score={-25} />);
      const gauge = screen.getByRole("meter");
      expect(gauge.getAttribute("data-score")).toBe("0");
      expect(gauge.getAttribute("data-badge-color")).toBe("red");
      expect(screen.getByTestId("score-value").textContent).toBe("0");
    });

    it("clamps scores over 100 to 100", () => {
      render(<ScoreGauge score={140} />);
      const gauge = screen.getByRole("meter");
      expect(gauge.getAttribute("data-score")).toBe("100");
      expect(gauge.getAttribute("data-badge-color")).toBe("brightgreen");
      expect(screen.getByTestId("score-value").textContent).toBe("100");
    });

    it("rounds decimal scores to nearest integer", () => {
      const { unmount } = render(<ScoreGauge score={61.4} />);
      expect(screen.getByTestId("score-value").textContent).toBe("61");
      unmount();

      render(<ScoreGauge score={61.6} />);
      expect(screen.getByTestId("score-value").textContent).toBe("62");
    });

    it("handles NaN, Infinity, and non-numeric inputs safely", () => {
      render(<ScoreGauge score={Number.NaN} />);
      const gauge = screen.getByRole("meter");
      expect(gauge.getAttribute("data-score")).toBe("0");
      expect(screen.getByTestId("score-value").textContent).toBe("0");
    });

    it("accepts healthScore prop alias interchangeably", () => {
      render(<ScoreGauge healthScore={88} />);
      const gauge = screen.getByRole("meter");
      expect(gauge.getAttribute("data-score")).toBe("88");
      expect(gauge.getAttribute("data-badge-color")).toBe("green");
      expect(screen.getByTestId("score-value").textContent).toBe("88");
    });

    it("prefers score over healthScore when both are provided", () => {
      render(<ScoreGauge score={92} healthScore={40} />);
      const gauge = screen.getByRole("meter");
      expect(gauge.getAttribute("data-score")).toBe("92");
      expect(gauge.getAttribute("data-badge-color")).toBe("brightgreen");
      expect(screen.getByTestId("score-value").textContent).toBe("92");
    });

    it("defaults to 0 when no score is passed", () => {
      render(<ScoreGauge />);
      const gauge = screen.getByRole("meter");
      expect(gauge.getAttribute("data-score")).toBe("0");
      expect(screen.getByTestId("score-value").textContent).toBe("0");
    });
  });

  describe("Accessibility Attributes", () => {
    it("renders with role=meter and standard ARIA attributes", () => {
      render(<ScoreGauge score={85} />);
      const gauge = screen.getByRole("meter");

      expect(gauge.getAttribute("aria-valuemin")).toBe("0");
      expect(gauge.getAttribute("aria-valuemax")).toBe("100");
      expect(gauge.getAttribute("aria-valuenow")).toBe("85");
      expect(gauge.getAttribute("aria-label")).toContain("85 out of 100");
    });

    it("allows custom aria-label", () => {
      render(<ScoreGauge score={75} aria-label="Custom accessibility rating" />);
      const gauge = screen.getByRole("meter");
      expect(gauge.getAttribute("aria-label")).toBe("Custom accessibility rating");
    });

    it("sets aria-hidden on decorative SVG element", () => {
      const { container } = render(<ScoreGauge score={50} />);
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("Display & Customization Options", () => {
    it("hides max score when showMaxScore is false", () => {
      render(<ScoreGauge score={80} showMaxScore={false} />);
      expect(screen.queryByTestId("score-max")).toBeNull();
    });

    it("renders custom label when provided", () => {
      render(<ScoreGauge score={90} label="Repository Health" />);
      const statusEl = screen.getByTestId("score-status");
      expect(statusEl.textContent).toBe("Repository Health");
    });

    it("renders default status label when showStatus is true without custom label", () => {
      render(<ScoreGauge score={95} showStatus={true} />);
      const statusEl = screen.getByTestId("score-status");
      expect(statusEl.textContent).toBe("Excellent");
    });

    it("does not render status label when showStatus is false and label is undefined", () => {
      render(<ScoreGauge score={95} showStatus={false} />);
      expect(screen.queryByTestId("score-status")).toBeNull();
    });

    it("allows custom className and data-testid", () => {
      render(<ScoreGauge score={50} className="custom-gauge-class" data-testid="custom-gauge" />);
      const gauge = screen.getByTestId("custom-gauge");
      expect(gauge.className).toContain("custom-gauge-class");
    });
  });

  describe("Size Variants", () => {
    it("applies preset size classes for sm, md, and lg", () => {
      const { unmount: u1 } = render(<ScoreGauge score={50} size="sm" />);
      let gauge = screen.getByRole("meter");
      expect(gauge.className).toContain("size-20");
      u1();

      const { unmount: u2 } = render(<ScoreGauge score={50} size="md" />);
      gauge = screen.getByRole("meter");
      expect(gauge.className).toContain("size-32");
      u2();

      render(<ScoreGauge score={50} size="lg" />);
      gauge = screen.getByRole("meter");
      expect(gauge.className).toContain("size-44");
    });

    it("applies inline style dimensions when size is a number", () => {
      render(<ScoreGauge score={70} size={150} />);
      const gauge = screen.getByRole("meter");
      expect(gauge.style.width).toBe("150px");
      expect(gauge.style.height).toBe("150px");
    });

    it("allows custom strokeWidth", () => {
      const { container } = render(<ScoreGauge score={70} strokeWidth={14} />);
      const indicator = container.querySelector('[data-slot="gauge-indicator"]');
      const track = container.querySelector('[data-slot="gauge-track"]');
      expect(indicator?.getAttribute("stroke-width")).toBe("14");
      expect(track?.getAttribute("stroke-width")).toBe("14");
    });
  });

  describe("SVG Geometry and Math", () => {
    it("computes SVG circumference and target dash offset correctly", () => {
      const radius = 50;
      const expectedCircumference = 2 * Math.PI * radius; // ~314.159265
      const score = 75;
      const expectedOffset = expectedCircumference * (1 - score / 100);

      const { container } = render(<ScoreGauge score={score} animated={false} />);
      const indicator = container.querySelector('[data-slot="gauge-indicator"]');

      expect(Number(indicator?.getAttribute("stroke-dasharray"))).toBeCloseTo(
        expectedCircumference,
        3,
      );
      expect(Number(indicator?.getAttribute("stroke-dashoffset"))).toBeCloseTo(
        expectedOffset,
        3,
      );
    });
  });

  describe("Pure Utility Functions", () => {
    it("normalizeScore handles various inputs", () => {
      expect(normalizeScore(0)).toBe(0);
      expect(normalizeScore(100)).toBe(100);
      expect(normalizeScore(50)).toBe(50);
      expect(normalizeScore(-10)).toBe(0);
      expect(normalizeScore(110)).toBe(100);
      expect(normalizeScore(74.6)).toBe(75);
      expect(normalizeScore(undefined)).toBe(0);
      expect(normalizeScore(null)).toBe(0);
      expect(normalizeScore("80")).toBe(0);
      expect(normalizeScore(Number.NaN)).toBe(0);
    });

    it("getScoreGaugePalette returns matching palette definition", () => {
      const { color, palette } = getScoreGaugePalette(95);
      expect(color).toBe("brightgreen");
      expect(palette.hex).toBe(BADGE_COLOR_PALETTE.brightgreen.hex);
      expect(palette.label).toBe("Excellent");
    });
  });
});
