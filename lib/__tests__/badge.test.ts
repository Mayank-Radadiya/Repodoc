import { describe, expect, it } from "vitest";
import {
  BADGE_CACHE_CONTROL,
  BADGE_LABEL,
  formatBadgeError,
  formatBadgeResponse,
  getBadgeColor,
} from "@/lib/badge";

describe("badge utilities", () => {
  describe("getBadgeColor", () => {
    it("returns brightgreen for scores >= 90", () => {
      expect(getBadgeColor(100)).toBe("brightgreen");
      expect(getBadgeColor(95)).toBe("brightgreen");
      expect(getBadgeColor(90)).toBe("brightgreen");
    });

    it("returns green for scores >= 75 and < 90", () => {
      expect(getBadgeColor(89)).toBe("green");
      expect(getBadgeColor(80)).toBe("green");
      expect(getBadgeColor(75)).toBe("green");
    });

    it("returns yellow for scores >= 60 and < 75", () => {
      expect(getBadgeColor(74)).toBe("yellow");
      expect(getBadgeColor(65)).toBe("yellow");
      expect(getBadgeColor(60)).toBe("yellow");
    });

    it("returns orange for scores >= 40 and < 60", () => {
      expect(getBadgeColor(59)).toBe("orange");
      expect(getBadgeColor(45)).toBe("orange");
      expect(getBadgeColor(40)).toBe("orange");
    });

    it("returns red for scores < 40", () => {
      expect(getBadgeColor(39)).toBe("red");
      expect(getBadgeColor(20)).toBe("red");
      expect(getBadgeColor(0)).toBe("red");
      expect(getBadgeColor(-10)).toBe("red");
    });
  });

  describe("formatBadgeResponse", () => {
    it("generates correct shields.io schema for valid scores", () => {
      expect(formatBadgeResponse(92)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "92/100",
        color: "brightgreen",
      });

      expect(formatBadgeResponse(78)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "78/100",
        color: "green",
      });

      expect(formatBadgeResponse(62)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "62/100",
        color: "yellow",
      });

      expect(formatBadgeResponse(45)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "45/100",
        color: "orange",
      });

      expect(formatBadgeResponse(15)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "15/100",
        color: "red",
      });
    });

    it("rounds fractional scores to nearest integer", () => {
      expect(formatBadgeResponse(89.6)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "90/100",
        color: "brightgreen",
      });

      expect(formatBadgeResponse(89.4)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "89/100",
        color: "green",
      });
    });

    it("clamps scores beyond 0-100 range defensively", () => {
      expect(formatBadgeResponse(-10)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "0/100",
        color: "red",
      });

      expect(formatBadgeResponse(120)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "100/100",
        color: "brightgreen",
      });
    });

    it("handles non-finite scores safely", () => {
      expect(formatBadgeResponse(NaN)).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: "0/100",
        color: "red",
      });
    });
  });

  describe("formatBadgeError", () => {
    it("creates a shields-compatible error badge", () => {
      expect(formatBadgeError("not found")).toEqual({
        schemaVersion: 1,
        isError: true,
        label: "repo health",
        message: "not found",
        color: "red",
      });
    });

    it("falls back to generic message when string is empty", () => {
      expect(formatBadgeError("")).toEqual({
        schemaVersion: 1,
        isError: true,
        label: "repo health",
        message: "error",
        color: "red",
      });
    });
  });

  describe("constants", () => {
    it("exports standard label and cache-control", () => {
      expect(BADGE_LABEL).toBe("repo health");
      expect(BADGE_CACHE_CONTROL).toBe(
        "public, s-maxage=3600, stale-while-revalidate=86400",
      );
    });
  });
});
