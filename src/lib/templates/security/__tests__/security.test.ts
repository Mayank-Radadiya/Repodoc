// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  renderSecurityPolicy,
  DEFAULT_RESPONSE_SLA,
  DEFAULT_PROJECT_NAME,
  SECURITY_POLICY_TARGET_PATH,
  SECURITY_POLICY_TEMPLATE,
  type SecurityPolicyOptions,
  type SupportedVersionRow,
} from "..";
import * as rootAliasSecurity from "@/lib/templates/security";
import { checkSecurityPolicy } from "../../../scoring/checks/security";

describe("renderSecurityPolicy", () => {
  it("renders a standard security policy without arguments", () => {
    const result = renderSecurityPolicy();

    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(100);
    expect(result).toContain("# Security Policy");
    expect(result).toContain("## Supported Versions");
    expect(result).toContain("## Reporting a Vulnerability");
    expect(result).toContain("## What to Include in a Report");
    expect(result).toContain("## Preferred Disclosure Process");
  });

  it("exports SECURITY_POLICY_TARGET_PATH, constants, and templates with root alias parity", () => {
    expect(SECURITY_POLICY_TARGET_PATH).toBe("SECURITY.md");
    expect(rootAliasSecurity.SECURITY_POLICY_TARGET_PATH).toBe("SECURITY.md");
    expect(rootAliasSecurity.renderSecurityPolicy).toBe(renderSecurityPolicy);
    expect(rootAliasSecurity.DEFAULT_PROJECT_NAME).toBe(DEFAULT_PROJECT_NAME);
    expect(rootAliasSecurity.DEFAULT_RESPONSE_SLA).toBe(DEFAULT_RESPONSE_SLA);
    expect(rootAliasSecurity.SECURITY_POLICY_TEMPLATE).toBe(SECURITY_POLICY_TEMPLATE);
  });

  it("never contains unrendered placeholders in the output", () => {
    const defaultResult = renderSecurityPolicy();
    expect(defaultResult).not.toMatch(/\{\{[^}]+\}\}/);
    expect(defaultResult).not.toMatch(/\[TODO\]/i);
    expect(defaultResult).not.toMatch(/\[TBD\]/i);
    expect(defaultResult).not.toMatch(/<your-[^>]+>/i);

    const options: SecurityPolicyOptions = {
      projectName: "SuperApp",
      contact: "security@superapp.example.com",
      responseSla: "24 hours",
      supportedVersions: [
        { version: "3.x", supported: true, notes: "Latest release" },
        { version: "2.x", supported: false, notes: "EOL" },
      ],
      additionalInfo: "PGP Key fingerprint: ABCD 1234",
    };
    const customizedResult = renderSecurityPolicy(options);

    expect(customizedResult).not.toMatch(/\{\{[^}]+\}\}/);
    expect(customizedResult).not.toMatch(/\[TODO\]/i);
    expect(customizedResult).not.toMatch(/\[TBD\]/i);
    expect(customizedResult).not.toMatch(/<your-[^>]+>/i);
  });

  it("normalizes output to UNIX LF line endings and terminates with a newline", () => {
    const result = renderSecurityPolicy();

    expect(result).not.toContain("\r");
    expect(result.endsWith("\n")).toBe(true);
  });

  it("customizes the project name when provided", () => {
    const result = renderSecurityPolicy({ projectName: "Repodoc Engine" });

    expect(result).toContain("# Security Policy for Repodoc Engine");
    expect(result).toContain("security of Repodoc Engine");
  });

  it("falls back to default project name when omitted or empty", () => {
    const result = renderSecurityPolicy({});
    expect(result).toContain(`# Security Policy for ${DEFAULT_PROJECT_NAME}`);

    const resultUndefined = renderSecurityPolicy(undefined);
    expect(resultUndefined).toContain(`# Security Policy for ${DEFAULT_PROJECT_NAME}`);
  });

  it("customizes the contact method with an email address", () => {
    const result = renderSecurityPolicy({
      contact: "security@example.com",
    });

    expect(result).toContain("security@example.com");
    expect(result).toContain("mailto:security@example.com");
  });

  it("customizes the contact method with a URL", () => {
    const result = renderSecurityPolicy({
      contact: "https://github.com/my-org/my-repo/security/advisories/new",
    });

    expect(result).toContain("https://github.com/my-org/my-repo/security/advisories/new");
  });

  it("uses default contact instructions when contact is not specified", () => {
    const result = renderSecurityPolicy({});

    expect(result).toContain("GitHub Private Vulnerability Reporting");
    expect(result).toContain("Security Advisories");
  });

  it("renders a custom supported versions table", () => {
    const versions: SupportedVersionRow[] = [
      { version: "2.x", supported: true, notes: "Actively supported" },
      { version: "1.x", supported: false, notes: "End of life since Dec 2025" },
    ];

    const result = renderSecurityPolicy({ supportedVersions: versions });

    expect(result).toContain("| Version | Supported | Notes |");
    expect(result).toContain("| 2.x | :white_check_mark: | Actively supported |");
    expect(result).toContain("| 1.x | :x: | End of life since Dec 2025 |");
  });

  it("renders a default supported versions table when none provided", () => {
    const result = renderSecurityPolicy();

    expect(result).toContain("| Version | Supported | Notes |");
    expect(result).toContain(":white_check_mark:");
  });

  it("customizes response SLA timeframe", () => {
    const result = renderSecurityPolicy({ responseSla: "24 hours" });

    expect(result).toContain("within 24 hours");
  });

  it("uses default response SLA when omitted", () => {
    const result = renderSecurityPolicy();

    expect(result).toContain(`within ${DEFAULT_RESPONSE_SLA}`);
  });

  it("includes additional security information when provided", () => {
    const result = renderSecurityPolicy({
      additionalInfo: "Our security team PGP public key can be fetched at https://example.com/pgp.key.",
    });

    expect(result).toContain("## Additional Security Information");
    expect(result).toContain("https://example.com/pgp.key");
  });

  it("does not render additional info section when omitted", () => {
    const result = renderSecurityPolicy();

    expect(result).not.toContain("## Additional Security Information");
  });

  it("trims whitespace from string options", () => {
    const result = renderSecurityPolicy({
      projectName: "   Padded Name   ",
      contact: "  security@padded.com  ",
      responseSla: "   72 hours   ",
    });

    expect(result).toContain("# Security Policy for Padded Name");
    expect(result).toContain("mailto:security@padded.com");
    expect(result).toContain("within 72 hours");
    expect(result).not.toContain("   Padded Name   ");
  });

  it("throws TypeError if options is not an object or undefined", () => {
    // @ts-expect-error invalid argument type
    expect(() => renderSecurityPolicy(123)).toThrow(TypeError);
    // @ts-expect-error invalid argument type
    expect(() => renderSecurityPolicy("string")).toThrow(TypeError);
    // @ts-expect-error invalid argument type
    expect(() => renderSecurityPolicy(null)).toThrow(TypeError);
  });

  it("throws TypeError if string properties contain carriage returns or newlines", () => {
    expect(() =>
      renderSecurityPolicy({ projectName: "Line1\nLine2" }),
    ).toThrow(TypeError);

    expect(() =>
      renderSecurityPolicy({ contact: "user@example.com\r\nBcc: evil@attacker.com" }),
    ).toThrow(TypeError);

    expect(() =>
      renderSecurityPolicy({ responseSla: "24 hours\nmalicious" }),
    ).toThrow(TypeError);
  });

  it("integrates seamlessly with checkSecurityPolicy and scores 10/10 points", () => {
    const rendered = renderSecurityPolicy();
    const paths = new Set(["security.md"]);

    const checkResult = checkSecurityPolicy(paths, { content: rendered });

    expect(checkResult.passed).toBe(true);
    expect(checkResult.pointsAwarded).toBe(10);
    expect(checkResult.maxPoints).toBe(10);
    expect(checkResult.evidence.found).toBe(true);
    expect(checkResult.evidence.details).toContain("with verified non-empty content");
  });
});
