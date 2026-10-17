// @vitest-environment node

import { describe, expect, it } from "vitest";
import YAML from "yaml";
import type { RepoTree, TreeEntry } from "@/src/lib/types";
import {
  CI_WORKFLOW_TARGET_PATH,
  SUPPORTED_CI_LANGUAGES,
  detectLanguage,
  generateCIWorkflow,
  renderCIWorkflow,
} from "..";
import * as rootAliasCI from "@/lib/templates/ci";

interface WorkflowStep {
  name?: string;
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
}

interface ParsedWorkflow {
  name: string;
  on: {
    push?: { branches?: string[] };
    pull_request?: { branches?: string[] };
  };
  jobs: {
    test: {
      "runs-on": string;
      steps: WorkflowStep[];
    };
  };
}

describe("CI Workflow Template", () => {
  describe("SUPPORTED_CI_LANGUAGES and constants", () => {
    it("exposes supported languages and target path constant", () => {
      expect([...SUPPORTED_CI_LANGUAGES].sort()).toEqual(
        ["generic", "go", "node", "python", "rust"].sort(),
      );
      expect(Object.isFrozen(SUPPORTED_CI_LANGUAGES)).toBe(true);
      expect(CI_WORKFLOW_TARGET_PATH).toBe(".github/workflows/ci.yml");
    });
  });

  describe("detectLanguage", () => {
    it("detects Node projects from package manifest and lockfiles", () => {
      expect(detectLanguage(new Set(["package.json"]))).toBe("node");
      expect(detectLanguage(new Set(["package-lock.json"]))).toBe("node");
      expect(detectLanguage(new Set(["pnpm-lock.yaml"]))).toBe("node");
      expect(detectLanguage(new Set(["yarn.lock"]))).toBe("node");
      expect(detectLanguage(new Set(["bun.lockb"]))).toBe("node");
      expect(detectLanguage(new Set(["bun.lock"]))).toBe("node");
    });

    it("detects Python projects from manifest and dependency files", () => {
      expect(detectLanguage(new Set(["pyproject.toml"]))).toBe("python");
      expect(detectLanguage(new Set(["setup.py"]))).toBe("python");
      expect(detectLanguage(new Set(["setup.cfg"]))).toBe("python");
      expect(detectLanguage(new Set(["requirements.txt"]))).toBe("python");
      expect(detectLanguage(new Set(["Pipfile"]))).toBe("python");
      expect(detectLanguage(new Set(["poetry.lock"]))).toBe("python");
    });

    it("detects Go projects from go.mod and go.sum", () => {
      expect(detectLanguage(new Set(["go.mod"]))).toBe("go");
      expect(detectLanguage(new Set(["go.sum"]))).toBe("go");
    });

    it("detects Rust projects from Cargo.toml and Cargo.lock", () => {
      expect(detectLanguage(new Set(["Cargo.toml"]))).toBe("rust");
      expect(detectLanguage(new Set(["Cargo.lock"]))).toBe("rust");
    });

    it("falls back to language-specific test file conventions when no manifest exists", () => {
      expect(detectLanguage(new Set(["pkg/math_test.go"]))).toBe("go");
      expect(detectLanguage(new Set(["src/parser_test.rs"]))).toBe("rust");
      expect(detectLanguage(new Set(["tests/test_api.py"]))).toBe("python");
      expect(detectLanguage(new Set(["tests/api_test.py"]))).toBe("python");
      expect(detectLanguage(new Set(["src/components/button.test.tsx"]))).toBe("node");
      expect(detectLanguage(new Set(["tests/index.spec.js"]))).toBe("node");
    });

    it("falls back to generic when no recognized files exist", () => {
      expect(detectLanguage(new Set(["README.md", "LICENSE"]))).toBe("generic");
      expect(detectLanguage(new Set([]))).toBe("generic");
    });

    it("handles case-insensitive path lookups", () => {
      expect(detectLanguage(new Set(["PACKAGE.JSON"]))).toBe("node");
      expect(detectLanguage(new Set(["CARGO.TOML"]))).toBe("rust");
      expect(detectLanguage(new Set(["GO.MOD"]))).toBe("go");
      expect(detectLanguage(new Set(["PYPROJECT.TOML"]))).toBe("python");
    });

    it("accepts TreeEntry array and RepoTree objects", () => {
      const treeEntries: TreeEntry[] = [
        { path: "Cargo.toml", mode: "100644", type: "blob", sha: "abc1" },
        { path: "src/main.rs", mode: "100644", type: "blob", sha: "abc2" },
      ];
      expect(detectLanguage(treeEntries)).toBe("rust");

      const repoTree: RepoTree = {
        sha: "root-sha",
        tree: [
          { path: "go.mod", mode: "100644", type: "blob", sha: "g1" },
          { path: "main.go", mode: "100644", type: "blob", sha: "g2" },
        ],
        truncated: false,
      };
      expect(detectLanguage(repoTree)).toBe("go");
    });

    it("respects deterministic manifest precedence (Node > Python > Go > Rust)", () => {
      expect(detectLanguage(new Set(["package.json", "setup.py"]))).toBe("node");
      expect(detectLanguage(new Set(["pyproject.toml", "go.mod"]))).toBe("python");
      expect(detectLanguage(new Set(["go.mod", "Cargo.toml"]))).toBe("go");
    });

    it("throws a TypeError on invalid paths input", () => {
      // @ts-expect-error invalid input test
      expect(() => detectLanguage(null)).toThrow(TypeError);
      // @ts-expect-error invalid input test
      expect(() => detectLanguage(undefined)).toThrow(TypeError);
      // @ts-expect-error invalid input test
      expect(() => detectLanguage(123)).toThrow(TypeError);
    });
  });

  describe("renderCIWorkflow", () => {
    it.each(SUPPORTED_CI_LANGUAGES)(
      "renders syntactically valid YAML with correct core structure for '%s'",
      (lang) => {
        const workflow = renderCIWorkflow(lang);

        expect(workflow).not.toContain("\r");
        expect(workflow.endsWith("\n")).toBe(true);

        const parsed = YAML.parse(workflow) as ParsedWorkflow;
        expect(parsed).toBeDefined();
        expect(parsed.name).toBe("CI");
        expect(parsed.on).toBeDefined();
        expect(parsed.on.push?.branches).toEqual(["main", "master"]);
        expect(parsed.on.pull_request?.branches).toEqual(["main", "master"]);
        expect(parsed.jobs.test["runs-on"]).toBe("ubuntu-latest");

        const steps = parsed.jobs.test.steps;
        expect(steps.length).toBeGreaterThanOrEqual(1);
        expect(steps[0]?.uses).toMatch(/^actions\/checkout@v\d+$/);
      },
    );

    it("renders Node CI workflow with actions/setup-node and npm test", () => {
      const workflow = renderCIWorkflow("node");
      const parsed = YAML.parse(workflow) as ParsedWorkflow;
      const steps = parsed.jobs.test.steps;

      const setupStep = steps.find((s) => s.uses?.startsWith("actions/setup-node"));
      expect(setupStep).toBeDefined();
      expect(setupStep?.with?.["node-version"]).toBeDefined();

      const testStep = steps.find((s) => s.run?.includes("npm test"));
      expect(testStep).toBeDefined();
    });

    it("renders Python CI workflow with actions/setup-python and pytest", () => {
      const workflow = renderCIWorkflow("python");
      const parsed = YAML.parse(workflow) as ParsedWorkflow;
      const steps = parsed.jobs.test.steps;

      const setupStep = steps.find((s) => s.uses?.startsWith("actions/setup-python"));
      expect(setupStep).toBeDefined();
      expect(setupStep?.with?.["python-version"]).toBeDefined();

      const testStep = steps.find((s) => s.run?.includes("pytest"));
      expect(testStep).toBeDefined();
    });

    it("renders Go CI workflow with actions/setup-go and go test ./...", () => {
      const workflow = renderCIWorkflow("go");
      const parsed = YAML.parse(workflow) as ParsedWorkflow;
      const steps = parsed.jobs.test.steps;

      const setupStep = steps.find((s) => s.uses?.startsWith("actions/setup-go"));
      expect(setupStep).toBeDefined();
      expect(setupStep?.with?.["go-version"]).toBeDefined();

      const testStep = steps.find((s) => s.run?.includes("go test ./..."));
      expect(testStep).toBeDefined();
    });

    it("renders Rust CI workflow with actions-rs/toolchain and cargo test", () => {
      const workflow = renderCIWorkflow("rust");
      const parsed = YAML.parse(workflow) as ParsedWorkflow;
      const steps = parsed.jobs.test.steps;

      const setupStep = steps.find((s) => s.uses?.startsWith("actions-rs/toolchain"));
      expect(setupStep).toBeDefined();

      const testStep = steps.find((s) => s.run?.includes("cargo test"));
      expect(testStep).toBeDefined();
    });

    it("renders generic CI workflow as checkout-only without test steps", () => {
      const workflow = renderCIWorkflow("generic");
      const parsed = YAML.parse(workflow) as ParsedWorkflow;
      const steps = parsed.jobs.test.steps;

      expect(steps.length).toBe(1);
      expect(steps[0]?.uses).toMatch(/^actions\/checkout@v\d+$/);
    });

    it("customizes default branch when provided", () => {
      const workflow = renderCIWorkflow("node", { defaultBranch: "develop" });
      const parsed = YAML.parse(workflow) as ParsedWorkflow;

      expect(parsed.on.push?.branches).toEqual(["develop"]);
      expect(parsed.on.pull_request?.branches).toEqual(["develop"]);
    });

    it("customizes workflow name when provided", () => {
      const workflow = renderCIWorkflow("go", { workflowName: "Build & Test" });
      const parsed = YAML.parse(workflow) as ParsedWorkflow;

      expect(parsed.name).toBe("Build & Test");
    });

    it("safely generates valid YAML when workflow name contains colons and special characters", () => {
      const workflowWithColon = renderCIWorkflow("node", {
        workflowName: "CI: Build & Test",
      });
      const parsedColon = YAML.parse(workflowWithColon) as ParsedWorkflow;
      expect(parsedColon.name).toBe("CI: Build & Test");

      const workflowWithBrackets = renderCIWorkflow("python", {
        workflowName: "[Quality] Lint, Typecheck & Test: Matrix (3.11)",
      });
      const parsedBrackets = YAML.parse(workflowWithBrackets) as ParsedWorkflow;
      expect(parsedBrackets.name).toBe(
        "[Quality] Lint, Typecheck & Test: Matrix (3.11)",
      );
    });

    it("safely formats custom branches with special characters", () => {
      const workflow = renderCIWorkflow("go", {
        defaultBranch: "release/v2.0-beta",
      });
      const parsed = YAML.parse(workflow) as ParsedWorkflow;
      expect(parsed.on.push?.branches).toEqual(["release/v2.0-beta"]);
      expect(parsed.on.pull_request?.branches).toEqual(["release/v2.0-beta"]);
    });

    it("rejects multiline workflowName and defaultBranch with TypeError", () => {
      expect(() =>
        renderCIWorkflow("node", { workflowName: "CI\njobs:\n  evil:" }),
      ).toThrow(TypeError);
      expect(() =>
        renderCIWorkflow("node", { defaultBranch: "main\n  - evil" }),
      ).toThrow(TypeError);
    });

    it("exports CI utilities and constants with root alias parity", () => {
      expect(rootAliasCI.CI_WORKFLOW_TARGET_PATH).toBe(CI_WORKFLOW_TARGET_PATH);
      expect(rootAliasCI.SUPPORTED_CI_LANGUAGES).toEqual(SUPPORTED_CI_LANGUAGES);
      expect(rootAliasCI.detectLanguage).toBe(detectLanguage);
      expect(rootAliasCI.renderCIWorkflow).toBe(renderCIWorkflow);
      expect(rootAliasCI.generateCIWorkflow).toBe(generateCIWorkflow);
    });

    it("throws a TypeError on unsupported language identifier", () => {
      // @ts-expect-error testing invalid language
      expect(() => renderCIWorkflow("ruby")).toThrow(TypeError);
      // @ts-expect-error testing invalid language
      expect(() => renderCIWorkflow("")).toThrow(TypeError);
      // @ts-expect-error testing invalid language
      expect(() => renderCIWorkflow(null)).toThrow(TypeError);
    });
  });

  describe("generateCIWorkflow", () => {
    it("detects language and returns targetPath, language, and workflow content", () => {
      const result = generateCIWorkflow(new Set(["package.json"]));

      expect(result.language).toBe("node");
      expect(result.targetPath).toBe(".github/workflows/ci.yml");
      expect(result.workflow).toContain("actions/setup-node");
      expect(result.workflow).toContain("npm test");

      const parsed = YAML.parse(result.workflow) as ParsedWorkflow;
      expect(parsed.name).toBe("CI");
    });

    it("allows overriding detected language via options", () => {
      const result = generateCIWorkflow(new Set(["package.json"]), {
        language: "python",
      });

      expect(result.language).toBe("python");
      expect(result.workflow).toContain("actions/setup-python");
      expect(result.workflow).toContain("pytest");
    });

    it("returns generic workflow when repository has no language signatures", () => {
      const result = generateCIWorkflow(new Set(["docs/index.md"]));

      expect(result.language).toBe("generic");
      expect(result.targetPath).toBe(".github/workflows/ci.yml");
      expect(result.workflow).toContain("actions/checkout");
      expect(result.workflow).not.toContain("actions/setup-");
    });

    it("passes custom defaultBranch through to generated workflow", () => {
      const result = generateCIWorkflow(new Set(["go.mod"]), {
        defaultBranch: "main",
      });

      const parsed = YAML.parse(result.workflow) as ParsedWorkflow;
      expect(parsed.on.push?.branches).toEqual(["main"]);
      expect(parsed.on.pull_request?.branches).toEqual(["main"]);
    });
  });
});
