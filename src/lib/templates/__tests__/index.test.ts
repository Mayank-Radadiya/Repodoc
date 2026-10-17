// @vitest-environment node

import { describe, expect, it } from "vitest";
import * as templates from "@/src/lib/templates";
import * as rootTemplates from "@/lib/templates";

describe("Unified Remediation Templates Barrel Export", () => {
  it("exports all five target path constants matching rubric remediation expectations", () => {
    expect(templates.LICENSE_TARGET_PATH).toBe("LICENSE");
    expect(templates.GITIGNORE_TARGET_PATH).toBe(".gitignore");
    expect(templates.CI_WORKFLOW_TARGET_PATH).toBe(".github/workflows/ci.yml");
    expect(templates.SECURITY_POLICY_TARGET_PATH).toBe("SECURITY.md");
    expect(templates.CODE_OF_CONDUCT_TARGET_PATH).toBe("CODE_OF_CONDUCT.md");
  });

  it("exports all generator and detection utilities", () => {
    expect(typeof templates.renderLicense).toBe("function");
    expect(typeof templates.detectLanguages).toBe("function");
    expect(typeof templates.renderGitignore).toBe("function");
    expect(typeof templates.detectLanguage).toBe("function");
    expect(typeof templates.renderCIWorkflow).toBe("function");
    expect(typeof templates.generateCIWorkflow).toBe("function");
    expect(typeof templates.renderSecurityPolicy).toBe("function");
    expect(typeof templates.renderCodeOfConduct).toBe("function");
  });

  it("supports root alias @/lib/templates with complete parity", () => {
    expect(rootTemplates.LICENSE_TARGET_PATH).toBe(templates.LICENSE_TARGET_PATH);
    expect(rootTemplates.GITIGNORE_TARGET_PATH).toBe(
      templates.GITIGNORE_TARGET_PATH,
    );
    expect(rootTemplates.CI_WORKFLOW_TARGET_PATH).toBe(
      templates.CI_WORKFLOW_TARGET_PATH,
    );
    expect(rootTemplates.SECURITY_POLICY_TARGET_PATH).toBe(
      templates.SECURITY_POLICY_TARGET_PATH,
    );
    expect(rootTemplates.CODE_OF_CONDUCT_TARGET_PATH).toBe(
      templates.CODE_OF_CONDUCT_TARGET_PATH,
    );

    expect(rootTemplates.renderLicense).toBe(templates.renderLicense);
    expect(rootTemplates.renderGitignore).toBe(templates.renderGitignore);
    expect(rootTemplates.renderCIWorkflow).toBe(templates.renderCIWorkflow);
    expect(rootTemplates.renderSecurityPolicy).toBe(
      templates.renderSecurityPolicy,
    );
    expect(rootTemplates.renderCodeOfConduct).toBe(
      templates.renderCodeOfConduct,
    );
  });

  it("generates all five remediation files end-to-end for a sample Node repository", () => {
    const paths = new Set(["package.json", "src/index.ts", "src/index.test.ts"]);

    // 1. License
    const license = templates.renderLicense("MIT", 2026, "Repodoc Contributors");
    expect(license).toContain("Copyright (c) 2026 Repodoc Contributors");
    expect(license).not.toMatch(/\{\{[^}]+\}\}/);

    // 2. .gitignore
    const gitignore = templates.renderGitignore(paths);
    expect(gitignore).toContain("node_modules/");
    expect(gitignore).toContain(".env");

    // 3. CI Workflow
    const ci = templates.generateCIWorkflow(paths, { defaultBranch: "main" });
    expect(ci.language).toBe("node");
    expect(ci.targetPath).toBe(".github/workflows/ci.yml");
    expect(ci.workflow).toContain("actions/setup-node@v4");
    expect(ci.workflow).toContain("npm test");

    // 4. SECURITY.md
    const security = templates.renderSecurityPolicy({ projectName: "SampleApp" });
    expect(security).toContain("# Security Policy for SampleApp");
    expect(security).not.toMatch(/\{\{[^}]+\}\}/);

    // 5. CODE_OF_CONDUCT.md
    const conduct = templates.renderCodeOfConduct("security@sampleapp.org");
    expect(conduct).toContain("reported to the community leaders responsible for enforcement at security@sampleapp.org.");
    expect(conduct).not.toContain("[INSERT CONTACT METHOD]");
  });
});
