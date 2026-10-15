import { describe, it, expect } from "vitest";
import {
  isShareId,
  isPersistedAuditReport,
  isRepositoryCoordinates,
} from "@/src/lib/report-validation";
import { ScoringEngine } from "@/src/lib/scoring/engine";

describe("report-validation", () => {
  describe("isShareId", () => {
    it.each([
      "test1234",
      "Ab0_-xyz",
      "12345678",
      "--------",
      "________",
      "aB3_cD9-",
    ])("accepts valid 8-character base64url share ID: %s", (shareId) => {
      expect(isShareId(shareId)).toBe(true);
    });

    it.each([
      "",
      "1234567", // 7 chars
      "123456789", // 9 chars
      "short",
      "toolongshareid",
      "test!123", // invalid char !
      "test@123", // invalid char @
      "test/123", // invalid char /
      "test.123", // invalid char .
      "test 123", // space
      null,
      undefined,
      12345678,
      {},
      [],
    ])("rejects invalid share ID input: %j", (input) => {
      expect(isShareId(input)).toBe(false);
    });
  });

  describe("isPersistedAuditReport", () => {
    const validReport = {
      ...ScoringEngine.run({ owner: "Owner", repo: "Repo", paths: new Set() }),
      shareId: "test1234",
    };

    it("accepts a complete persisted report with valid shareId", () => {
      expect(isPersistedAuditReport(validReport)).toBe(true);
    });

    it("rejects when shareId is missing or invalid", () => {
      expect(isPersistedAuditReport({ ...validReport, shareId: undefined })).toBe(false);
      expect(isPersistedAuditReport({ ...validReport, shareId: "invalid!" })).toBe(false);
      expect(isPersistedAuditReport({ ...validReport, shareId: "short" })).toBe(false);
    });
  });

  describe("isRepositoryCoordinates", () => {
    it("accepts valid owner and repo", () => {
      expect(isRepositoryCoordinates("facebook", "react")).toBe(true);
      expect(isRepositoryCoordinates("vercel", "next.js")).toBe(true);
    });

    it("rejects path traversal or empty coordinates", () => {
      expect(isRepositoryCoordinates("owner", "..")).toBe(false);
      expect(isRepositoryCoordinates("owner", ".")).toBe(false);
      expect(isRepositoryCoordinates("-invalid", "repo")).toBe(false);
    });
  });
});
