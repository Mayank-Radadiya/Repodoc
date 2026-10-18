// @vitest-environment node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPathSet } from "@/lib/scoring/utils";
import type { RepoTree, TreeEntry } from "@/lib/types";
import {
  detectLanguages,
  GITIGNORE_TARGET_PATH,
  renderGitignore,
  SUPPORTED_GITIGNORE_LANGUAGES,
} from "..";
import * as rootAliasGitignore from "@/lib/templates/gitignore";
import { GO_GITIGNORE } from "../go";
import { NODE_GITIGNORE } from "../node";
import { PYTHON_GITIGNORE } from "../python";
import { RUST_GITIGNORE } from "../rust";

function pathsFromTree(...paths: string[]): Set<string> {
  const tree: TreeEntry[] = paths.map((path) => ({
    path,
    mode: "100644",
    type: "blob",
    sha: "fixture-sha",
  }));
  return buildPathSet(tree);
}

describe("detectLanguages", () => {
  it.each([
    ["package.json", "node"],
    ["Cargo.toml", "rust"],
    ["go.mod", "go"],
    ["setup.py", "python"],
    ["pyproject.toml", "python"],
  ])("detects %s at the root and in nested projects", (manifest, language) => {
    expect(detectLanguages(pathsFromTree(manifest))).toEqual([language]);
    expect(detectLanguages(pathsFromTree(`packages/example/${manifest}`))).toEqual([
      language,
    ]);
  });

  it("uses case-normalized paths from buildPathSet", () => {
    expect(detectLanguages(pathsFromTree("Apps/Web/PACKAGE.JSON", "CARGO.TOML")))
      .toEqual(["node", "rust"]);
  });

  it("detects manifests case-insensitively on raw un-normalized Set<string>", () => {
    const rawSet = new Set(["src/Nested/Package.JSON", "Cargo.toml", "GO.MOD"]);
    expect(detectLanguages(rawSet)).toEqual(["node", "rust", "go"]);
  });

  it("accepts TreeEntry array and RepoTree objects", () => {
    const treeEntries: TreeEntry[] = [
      { path: "Cargo.toml", mode: "100644", type: "blob", sha: "1" },
      { path: "web/package.json", mode: "100644", type: "blob", sha: "2" },
    ];
    expect(detectLanguages(treeEntries)).toEqual(["node", "rust"]);

    const repoTree: RepoTree = {
      sha: "tree-sha",
      tree: treeEntries,
      truncated: false,
    };
    expect(detectLanguages(repoTree)).toEqual(["node", "rust"]);
    expect(renderGitignore(repoTree)).toContain("node_modules/");
    expect(renderGitignore(repoTree)).toContain("target\n");
  });

  it("throws a TypeError on invalid input to detectLanguages and renderGitignore", () => {
    expect(() => detectLanguages(null as unknown as Set<string>)).toThrow(TypeError);
    expect(() => detectLanguages(undefined as unknown as Set<string>)).toThrow(TypeError);
    expect(() => detectLanguages(42 as unknown as Set<string>)).toThrow(TypeError);
    expect(() => renderGitignore(null as unknown as Set<string>)).toThrow(TypeError);
  });

  it("exports GITIGNORE_TARGET_PATH, constants, and templates with root alias parity", () => {
    expect(GITIGNORE_TARGET_PATH).toBe(".gitignore");
    expect(rootAliasGitignore.GITIGNORE_TARGET_PATH).toBe(".gitignore");
    expect(rootAliasGitignore.detectLanguages).toBe(detectLanguages);
    expect(rootAliasGitignore.renderGitignore).toBe(renderGitignore);
    expect(rootAliasGitignore.SUPPORTED_GITIGNORE_LANGUAGES).toEqual(
      SUPPORTED_GITIGNORE_LANGUAGES,
    );
  });

  it("combines all languages in fixed order regardless of insertion order", () => {
    const manifests = ["pyproject.toml", "api/go.mod", "Cargo.toml", "web/package.json"];
    const expected = ["node", "rust", "go", "python"];
    expect(detectLanguages(pathsFromTree(...manifests))).toEqual(expected);
    expect(detectLanguages(pathsFromTree(...manifests.toReversed()))).toEqual(expected);
  });

  it("detects each language only once across projects and Python alternatives", () => {
    expect(detectLanguages(pathsFromTree(
      "package.json", "apps/web/package.json", "setup.py", "pyproject.toml",
      "services/api/pyproject.toml",
    ))).toEqual(["node", "python"]);
  });

  it.each([
    [],
    ["README.md", "Gemfile", "pom.xml"],
    ["notpackage.json", "Cargo.toml.bak", "go.module", "setup.py.txt", "pyproject.toml/README.md"],
    ["constructor", "toString", "__proto__"],
  ])("returns no languages for unsupported or non-manifest paths: %j", (...paths) => {
    expect(detectLanguages(pathsFromTree(...paths))).toEqual([]);
  });

  it("preserves the input and returns a fresh array", () => {
    const paths = pathsFromTree("package.json", "go.mod");
    const before = [...paths];
    const first = detectLanguages(paths);
    first.pop();
    expect(detectLanguages(paths)).toEqual(["node", "go"]);
    expect([...paths]).toEqual(before);
  });
});

describe("bundled upstream text", () => {
  it.each([
    ["Node", NODE_GITIGNORE, "119a33f6ca0e1aa09aca0a66af3f394749e646c13986d2529bd2a594e9a2cd00"],
    ["Rust", RUST_GITIGNORE, "26431918e449693f4385438e3955a1e078dbc9a4c78e68d8e6caf7a21647b1ff"],
    ["Go", GO_GITIGNORE, "63a6bdc727e45c5811e6a6d664205d2a07948f03881839831c2fa92434509da2"],
    ["Python", PYTHON_GITIGNORE, "bd3551745ade4ac05d25e0ea719b8b9e1b5dff1d05325375802ad50a9b5d8f18"],
  ])("preserves the complete pinned %s preset", (_language, content, digest) => {
    expect(createHash("sha256").update(content).digest("hex")).toBe(digest);
  });
});

describe("renderGitignore", () => {
  it("gives a Node project an active node_modules/ rule", () => {
    expect(renderGitignore(pathsFromTree("package.json")).split("\n"))
      .toContain("node_modules/");
  });

  it.each([
    ["Cargo.toml", "target"],
    ["go.mod", "*.test"],
    ["setup.py", "__pycache__/"],
    ["pyproject.toml", ".venv"],
  ])("includes representative rules for %s", (manifest, rule) => {
    expect(renderGitignore(pathsFromTree(manifest)).split("\n")).toContain(rule);
  });

  it("combines full presets without deduplicating rules or changing negations", () => {
    const output = renderGitignore(pathsFromTree(
      "package.json", "Cargo.toml", "go.mod", "pyproject.toml",
    ));
    const expected = [
      ["Node", NODE_GITIGNORE], ["Rust", RUST_GITIGNORE],
      ["Go", GO_GITIGNORE], ["Python", PYTHON_GITIGNORE],
    ].map(([label, content]) => `# ${label}\n${content.trimEnd()}\n`).join("\n");
    expect(output).toBe(expected);
    expect(output.split("\n").filter((line) => line === ".env")).toHaveLength(3);
    expect(output).toContain(".env.*\n!.env.example");
    expect(output).toContain(".yarn/*\n!.yarn/patches");
    expect(output).toContain(".pixi/*\n!.pixi/config.toml");
  });

  it("renders one section per detected language", () => {
    const output = renderGitignore(pathsFromTree("package.json", "web/package.json"));
    expect(output).toBe(`# Node\n${NODE_GITIGNORE.trimEnd()}\n`);
  });

  it("falls back to generic rules for empty and unsupported trees", () => {
    const generic = renderGitignore(new Set());
    expect(renderGitignore(pathsFromTree("README.md", "Gemfile"))).toBe(generic);
    expect(generic.split("\n")).toEqual(expect.arrayContaining([
      ".DS_Store", "Thumbs.db", "*.log", "*.tmp", "*.swp",
      ".env", ".env.*", "!.env.example",
    ]));
    expect(generic).not.toContain("node_modules/");
  });

  it.each([[], ["package.json"], ["Cargo.toml"], ["go.mod"], ["pyproject.toml"]])(
    "uses LF line endings and exactly one final newline for %j",
    (...manifests) => {
      const output = renderGitignore(pathsFromTree(...manifests));
      expect(output).not.toContain("\r");
      expect(output).toMatch(/[^\n]\n$/);
    },
  );

  it("is deterministic without mutating the input", () => {
    const paths = pathsFromTree("pyproject.toml", "package.json");
    const before = [...paths];
    const content = renderGitignore(paths);
    expect(renderGitignore(paths)).toBe(content);
    expect(renderGitignore(new Set(before.toReversed()))).toBe(content);
    expect([...paths]).toEqual(before);
  });
});

describe("Git ignore semantics", () => {
  const cases = [
    {
      name: "generic fallback",
      manifests: [],
      ignored: [".DS_Store", "Thumbs.db", "debug.log", "notes.tmp", "file.swp", ".env", ".env.local"],
      included: [".env.example", "src/main.ts", "README.md"],
    },
    {
      name: "Node",
      manifests: ["package.json"],
      ignored: ["node_modules/pkg/index.js", "apps/web/node_modules/pkg/index.js", ".next/cache/file", ".env.local", ".yarn/cache/pkg.zip"],
      included: [".env.example", "apps/web/.env.example", "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", ".yarn/patches/fix.patch", ".yarn/plugins/plugin.cjs"],
    },
    {
      name: "Rust",
      manifests: ["Cargo.toml"],
      ignored: ["target/debug/app", "crates/tool/target/debug/app", "src/main.rs.bk"],
      included: ["Cargo.toml", "Cargo.lock", "src/main.rs"],
    },
    {
      name: "Go",
      manifests: ["go.mod"],
      ignored: ["app.test", "coverage.out", "app.exe", ".env"],
      included: ["go.mod", "go.sum", "main.go", ".env.example"],
    },
    {
      name: "Python",
      manifests: ["pyproject.toml"],
      ignored: ["__pycache__/main.pyc", "services/api/__pycache__/main.pyc", ".venv/bin/python", ".pytest_cache/README.md", ".pixi/envs/default/file"],
      included: ["pyproject.toml", "setup.py", "uv.lock", "poetry.lock", "Pipfile.lock", ".env.example", ".pixi/config.toml"],
    },
    {
      name: "mixed nested projects",
      manifests: ["apps/web/package.json", "crates/tool/Cargo.toml", "api/go.mod", "worker/pyproject.toml"],
      ignored: ["apps/web/node_modules/pkg/index.js", "crates/tool/target/debug/app", "api/app.test", "worker/__pycache__/main.pyc", ".env.local"],
      included: ["apps/web/package.json", "apps/web/package-lock.json", "Cargo.lock", "go.sum", "uv.lock", ".env.example", ".yarn/patches/fix.patch", ".pixi/config.toml"],
    },
  ];

  it.each(cases)("checks real Git matching for $name", ({ manifests, ignored, included }) => {
    const cwd = mkdtempSync(join(tmpdir(), "repodoc-gitignore-"));
    try {
      const init = spawnSync("git", ["-c", "init.templateDir=", "init", "--quiet"], {
        cwd, encoding: "utf8",
      });
      expect(init.status, init.stderr).toBe(0);
      writeFileSync(join(cwd, ".gitignore"), renderGitignore(pathsFromTree(...manifests)));
      const result = spawnSync("git", [
        "-c", "core.excludesFile=/dev/null", "check-ignore", "--no-index", "--stdin", "-z",
      ], {
        cwd,
        encoding: "utf8",
        input: [...ignored, ...included].join("\0") + "\0",
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.split("\0").filter(Boolean)).toEqual(ignored);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
