// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { RepoTree, TreeEntry } from "@/src/lib/types";
import {
  CHECK_CI_WORKFLOW_ID,
  CHECK_TESTS_ID,
  MAX_POINTS_CI_WORKFLOW,
  MAX_POINTS_TESTING_CI,
  MAX_POINTS_TESTS,
  checkCIWorkflow,
  checkTestDirectory,
  checkTests,
  runTestingChecks,
} from "../testing";

describe("Testing & CI Checks", () => {
  describe("checkCIWorkflow", () => {
    it("awards 15 points when a .github/workflows/ci.yml file is present", () => {
      const paths = new Set([".github/workflows/ci.yml"]);
      const result = checkCIWorkflow(paths);

      expect(result.id).toBe(CHECK_CI_WORKFLOW_ID);
      expect(result.category).toBe("testing_ci");
      expect(result.name).toBe("Automated CI workflow");
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(15);
      expect(result.maxPoints).toBe(15);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.filesChecked).toEqual([".github/workflows/ci.yml"]);
      expect(result.evidence.details).toContain("Found 1 GitHub Actions workflow file(s)");
      expect(result.evidence.details).toContain(".github/workflows/ci.yml");
      expect(result.evidence.details).toContain(
        "Confirms workflow configuration presence; does not verify CI build or execution status",
      );
      expect(result.remediation).toBeUndefined();
    });

    it("awards 15 points when a .github/workflows/*.yaml file is present", () => {
      const paths = new Set([".github/workflows/build-pipeline.yaml"]);
      const result = checkCIWorkflow(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(15);
      expect(result.evidence.filesChecked).toEqual([
        ".github/workflows/build-pipeline.yaml",
      ]);
    });

    it("detects multiple workflow files and lists them deterministically", () => {
      const paths = new Set([
        ".github/workflows/test.yaml",
        ".github/workflows/ci.yml",
        ".github/workflows/lint.yml",
      ]);
      const result = checkCIWorkflow(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(15);
      expect(result.evidence.filesChecked).toEqual([
        ".github/workflows/ci.yml",
        ".github/workflows/lint.yml",
        ".github/workflows/test.yaml",
      ]);
      expect(result.evidence.details).toContain("Found 3 GitHub Actions workflow file(s)");
    });

    it("detects nested workflow files under .github/workflows/", () => {
      const paths = new Set([".github/workflows/sub/ci.yml"]);
      const result = checkCIWorkflow(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(15);
      expect(result.evidence.filesChecked).toEqual([".github/workflows/sub/ci.yml"]);
    });

    it("handles case-insensitive paths and extensions", () => {
      const paths = new Set([".GITHUB/WORKFLOWS/BUILD.YAML"]);
      const result = checkCIWorkflow(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(15);
      expect(result.evidence.filesChecked).toEqual([".github/workflows/build.yaml"]);
    });

    it("accepts TreeEntry[] array directly", () => {
      const tree: TreeEntry[] = [
        { path: ".github/workflows/ci.yml", mode: "100644", type: "blob", sha: "sha-1" },
        { path: "src/index.ts", mode: "100644", type: "blob", sha: "sha-2" },
      ];
      const result = checkCIWorkflow(tree);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(15);
    });

    it("accepts RepoTree object directly", () => {
      const repoTree: RepoTree = {
        sha: "tree-sha",
        truncated: false,
        tree: [
          { path: ".github/workflows/test.yml", mode: "100644", type: "blob", sha: "sha-1" },
        ],
      };
      const result = checkCIWorkflow(repoTree);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(15);
    });

    it("does not match non-YAML files inside .github/workflows/", () => {
      const paths = new Set([
        ".github/workflows/readme.md",
        ".github/workflows/setup.sh",
        ".github/workflows/config.json",
      ]);
      const result = checkCIWorkflow(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(15);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.details).toContain("No .yml or .yaml workflow files found");
      expect(result.remediation).toEqual({
        canAutomate: true,
        targetPath: ".github/workflows/ci.yml",
        description:
          "Add a GitHub Actions workflow in .github/workflows/ci.yml to automatically run tests on push and pull request events.",
      });
    });

    it("does not match workflow files outside of .github/workflows/", () => {
      const paths = new Set([
        ".github/ci.yml",
        ".github/actions/test/action.yml",
        "workflows/ci.yml",
        "ci.yml",
      ]);
      const result = checkCIWorkflow(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("returns 0 points and actionable remediation when repository is empty", () => {
      const paths = new Set<string>();
      const result = checkCIWorkflow(paths);

      expect(result.id).toBe(CHECK_CI_WORKFLOW_ID);
      expect(result.category).toBe("testing_ci");
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(15);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.filesChecked).toEqual([
        ".github/workflows/*.yml",
        ".github/workflows/*.yaml",
      ]);
      expect(result.remediation?.canAutomate).toBe(true);
      expect(result.remediation?.targetPath).toBe(".github/workflows/ci.yml");
    });
  });

  describe("checkTestDirectory", () => {
    it("awards 10 points when root test/ directory is present", () => {
      const paths = new Set(["test/index.test.js"]);
      const result = checkTestDirectory(paths);

      expect(result.id).toBe(CHECK_TESTS_ID);
      expect(result.name).toBe("Tests configured");
      expect(result.category).toBe("testing_ci");
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.maxPoints).toBe(10);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.filesChecked).toContain("test/index.test.js");
      expect(result.evidence.details).toContain("Evaluates test infrastructure configuration");
      expect(result.evidence.details).toContain("does not execute test suites");
      expect(result.remediation).toBeUndefined();
    });

    it("awards 10 points when root tests/ directory is present", () => {
      const paths = new Set(["tests/unit_test.py"]);
      const result = checkTestDirectory(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.evidence.filesChecked).toContain("tests/unit_test.py");
    });

    it("awards 10 points when root __tests__/ directory is present", () => {
      const paths = new Set(["__tests__/app.spec.ts"]);
      const result = checkTestDirectory(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.evidence.filesChecked).toContain("__tests__/app.spec.ts");
    });

    it("awards 10 points when root spec/ directory is present", () => {
      const paths = new Set(["spec/models/user_spec.rb"]);
      const result = checkTestDirectory(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.evidence.filesChecked).toContain("spec/models/user_spec.rb");
    });

    it("awards 10 points when standalone directory entries exist", () => {
      for (const dirName of ["test", "tests", "__tests__", "spec"]) {
        const paths = new Set([dirName]);
        const result = checkTestDirectory(paths);
        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.filesChecked).toContain(dirName);
      }
    });

    it("awards 10 points for nested test directories", () => {
      const paths = new Set([
        "src/__tests__/smoke.test.ts",
        "lib/tests/calculator.py",
        "app/spec/request_spec.rb",
      ]);
      const result = checkTestDirectory(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.evidence.filesChecked).toContain("src/__tests__/smoke.test.ts");
    });

    it("does not false-positive on words containing test or spec as substrings", () => {
      const paths = new Set([
        "contest/entry.py",
        "protest/banner.go",
        "latest/release.txt",
        "testimony/doc.md",
        "specsheet/hardware.pdf",
      ]);
      const result = checkTestDirectory(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.evidence.found).toBe(false);
    });

    describe("Language-specific test file conventions", () => {
      it("detects Go tests (*_test.go)", () => {
        const paths = new Set(["main_test.go", "pkg/auth/token_test.go"]);
        const result = checkTestDirectory(paths);

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.filesChecked).toContain("main_test.go");
        expect(result.evidence.filesChecked).toContain("pkg/auth/token_test.go");
      });

      it("detects Rust tests (*_test.rs)", () => {
        const paths = new Set(["lib_test.rs", "crates/core/src/parser_test.rs"]);
        const result = checkTestDirectory(paths);

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.filesChecked).toContain("lib_test.rs");
        expect(result.evidence.filesChecked).toContain("crates/core/src/parser_test.rs");
      });

      it("detects Python tests (test_*.py and *_test.py)", () => {
        const paths = new Set(["test_models.py", "services/worker_test.py"]);
        const result = checkTestDirectory(paths);

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.filesChecked).toContain("test_models.py");
        expect(result.evidence.filesChecked).toContain("services/worker_test.py");
      });

      it("detects JS/TS co-located test files (*.test.ts, *.spec.tsx, etc.)", () => {
        const paths = new Set([
          "src/utils.test.ts",
          "src/components/button.spec.tsx",
          "index.test.js",
        ]);
        const result = checkTestDirectory(paths);

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.filesChecked).toContain("src/utils.test.ts");
      });
    });

    describe("Package manifest test script detection", () => {
      it("awards 10 points when package.json defines a test script", () => {
        const paths = new Set(["package.json", "src/index.ts"]);
        const manifest = JSON.stringify({
          name: "my-app",
          scripts: {
            test: "vitest run",
          },
        });

        const result = checkTestDirectory(paths, manifest);

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.found).toBe(true);
        expect(result.evidence.filesChecked).toContain("package.json");
        expect(result.evidence.details).toContain('test script in package.json ("vitest run")');
      });

      it("accepts options object with manifestContent property", () => {
        const paths = new Set(["package.json"]);
        const manifest = JSON.stringify({
          scripts: { test: "jest" },
        });

        const result = checkTestDirectory(paths, { manifestContent: manifest });

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.details).toContain('test script in package.json ("jest")');
      });

      it("fails when package.json contains the default npm 'no test specified' placeholder", () => {
        const paths = new Set(["package.json", "src/index.ts"]);
        const manifest = JSON.stringify({
          scripts: {
            test: 'echo "Error: no test specified" && exit 1',
          },
        });

        const result = checkTestDirectory(paths, manifest);

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
      });

      it("fails when package.json has empty or whitespace-only test script", () => {
        const paths = new Set(["package.json"]);
        const manifest = JSON.stringify({
          scripts: { test: "   " },
        });

        const result = checkTestDirectory(paths, manifest);

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
      });

      it("fails when package.json has scripts object without test key", () => {
        const paths = new Set(["package.json"]);
        const manifest = JSON.stringify({
          scripts: { build: "tsc" },
        });

        const result = checkTestDirectory(paths, manifest);

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
      });

      it("handles malformed JSON in manifest gracefully without throwing", () => {
        const paths = new Set(["package.json"]);
        const malformedManifest = "{ not valid json: true, ";

        const result = checkTestDirectory(paths, malformedManifest);

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
      });

      it("reports both manifest test script and test files when both exist", () => {
        const paths = new Set(["tests/unit.test.ts", "package.json"]);
        const manifest = JSON.stringify({
          scripts: { test: "vitest run" },
        });

        const result = checkTestDirectory(paths, manifest);

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.filesChecked).toContain("package.json");
        expect(result.evidence.filesChecked).toContain("tests/unit.test.ts");
        expect(result.evidence.details).toContain('test script in package.json ("vitest run")');
        expect(result.evidence.details).toContain("tests/unit.test.ts");
      });
    });

    it("returns 0 points and actionable remediation when no test infrastructure is present", () => {
      const paths = new Set(["src/index.ts", "README.md"]);
      const result = checkTestDirectory(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(10);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.filesChecked).toEqual([
        "test/",
        "tests/",
        "__tests__/",
        "spec/",
        "*_test.go",
        "*_test.rs",
        "test_*.py",
        "package.json",
      ]);
      expect(result.remediation).toEqual({
        canAutomate: false,
        targetPath: "tests/",
        description:
          'Add a test directory (e.g., test/, tests/, __tests__/, spec/) with unit tests or configure a "test" script in package.json.',
      });
    });

    it("handles empty repository tree gracefully", () => {
      const paths = new Set<string>();
      const result = checkTestDirectory(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(10);
    });

    it("checkTests is an alias of checkTestDirectory", () => {
      expect(checkTests).toBe(checkTestDirectory);
    });
  });

  describe("runTestingChecks", () => {
    it("returns both checks and awards full 25 points when all criteria are satisfied", () => {
      const paths = new Set([
        ".github/workflows/ci.yml",
        "src/__tests__/smoke.test.ts",
      ]);
      const manifest = JSON.stringify({
        scripts: { test: "npm test" },
      });

      const results = runTestingChecks(paths, manifest);

      expect(results).toHaveLength(2);

      const ciCheck = results.find((c) => c.id === CHECK_CI_WORKFLOW_ID);
      const testCheck = results.find((c) => c.id === CHECK_TESTS_ID);

      expect(ciCheck).toBeDefined();
      expect(testCheck).toBeDefined();

      expect(ciCheck?.pointsAwarded).toBe(15);
      expect(ciCheck?.maxPoints).toBe(15);
      expect(ciCheck?.passed).toBe(true);

      expect(testCheck?.pointsAwarded).toBe(10);
      expect(testCheck?.maxPoints).toBe(10);
      expect(testCheck?.passed).toBe(true);

      const totalScore = results.reduce((acc, c) => acc + c.pointsAwarded, 0);
      const totalMax = results.reduce((acc, c) => acc + c.maxPoints, 0);

      expect(totalScore).toBe(25);
      expect(totalMax).toBe(MAX_POINTS_TESTING_CI);
    });

    it("awards 15 points when CI is configured but no tests are detected", () => {
      const paths = new Set([".github/workflows/ci.yml", "src/main.go"]);
      const results = runTestingChecks(paths);

      const totalScore = results.reduce((acc, c) => acc + c.pointsAwarded, 0);
      expect(totalScore).toBe(15);

      const ciCheck = results.find((c) => c.id === CHECK_CI_WORKFLOW_ID);
      const testCheck = results.find((c) => c.id === CHECK_TESTS_ID);

      expect(ciCheck?.passed).toBe(true);
      expect(ciCheck?.pointsAwarded).toBe(15);
      expect(testCheck?.passed).toBe(false);
      expect(testCheck?.pointsAwarded).toBe(0);
    });

    it("awards 10 points when tests are detected but no CI workflow exists", () => {
      const paths = new Set(["main_test.go"]);
      const results = runTestingChecks(paths);

      const totalScore = results.reduce((acc, c) => acc + c.pointsAwarded, 0);
      expect(totalScore).toBe(10);

      const ciCheck = results.find((c) => c.id === CHECK_CI_WORKFLOW_ID);
      const testCheck = results.find((c) => c.id === CHECK_TESTS_ID);

      expect(ciCheck?.passed).toBe(false);
      expect(ciCheck?.pointsAwarded).toBe(0);
      expect(testCheck?.passed).toBe(true);
      expect(testCheck?.pointsAwarded).toBe(10);
    });

    it("awards 0 points when neither CI nor tests are present", () => {
      const paths = new Set(["README.md", "LICENSE"]);
      const results = runTestingChecks(paths);

      const totalScore = results.reduce((acc, c) => acc + c.pointsAwarded, 0);
      expect(totalScore).toBe(0);

      const totalMax = results.reduce((acc, c) => acc + c.maxPoints, 0);
      expect(totalMax).toBe(25);

      expect(results.every((c) => !c.passed)).toBe(true);
      expect(results.every((c) => c.remediation !== undefined)).toBe(true);
    });

    it("category total score never exceeds 25 points under any circumstance", () => {
      const paths = new Set([
        ".github/workflows/ci.yml",
        ".github/workflows/test.yaml",
        ".github/workflows/release.yml",
        "test/foo.js",
        "tests/bar.py",
        "__tests__/baz.ts",
        "spec/qux_spec.rb",
        "pkg/auth/token_test.go",
        "crates/lib_test.rs",
      ]);
      const manifest = JSON.stringify({
        scripts: { test: "vitest run", test2: "jest" },
      });

      const results = runTestingChecks(paths, manifest);
      const totalScore = results.reduce((acc, c) => acc + c.pointsAwarded, 0);
      const totalMax = results.reduce((acc, c) => acc + c.maxPoints, 0);

      expect(totalScore).toBe(25);
      expect(totalMax).toBe(25);
      expect(totalScore).toBeLessThanOrEqual(MAX_POINTS_TESTING_CI);
    });

    it("produces deterministic, identical results across repeated runs", () => {
      const paths = new Set([
        ".github/workflows/build.yaml",
        ".github/workflows/ci.yml",
        "pkg/auth/token_test.go",
        "package.json",
      ]);
      const manifest = JSON.stringify({ scripts: { test: "go test ./..." } });

      const run1 = runTestingChecks(paths, manifest);
      const run2 = runTestingChecks(paths, manifest);

      expect(run1).toEqual(run2);
    });
  });

  describe("Constants and Scoring Weights", () => {
    it("exports standard IDs and max point allocations matching rubric v1.0", () => {
      expect(CHECK_CI_WORKFLOW_ID).toBe("ci-workflow");
      expect(CHECK_TESTS_ID).toBe("tests");
      expect(MAX_POINTS_CI_WORKFLOW).toBe(15);
      expect(MAX_POINTS_TESTS).toBe(10);
      expect(MAX_POINTS_TESTING_CI).toBe(25);
      expect(MAX_POINTS_CI_WORKFLOW + MAX_POINTS_TESTS).toBe(MAX_POINTS_TESTING_CI);
    });
  });
});
