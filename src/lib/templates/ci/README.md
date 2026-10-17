# Bundled CI Workflow Templates

Generates minimal, valid GitHub Actions CI workflows (`.github/workflows/ci.yml`) based on repository language detection or explicit caller configuration.

Import `detectLanguage`, `renderCIWorkflow`, and `generateCIWorkflow` from `@/src/lib/templates/ci`:

```ts
import {
  detectLanguage,
  renderCIWorkflow,
  generateCIWorkflow,
  CI_WORKFLOW_TARGET_PATH,
} from "@/src/lib/templates/ci";

// 1. Detect language from Git tree paths
const language = detectLanguage(repoTree); // "node" | "python" | "go" | "rust" | "generic"

// 2. Render workflow YAML string for a language
const workflowYaml = renderCIWorkflow(language);

// 3. Or detect and render in a single call
const { language, targetPath, workflow } = generateCIWorkflow(repoTree, {
  defaultBranch: "main",
});
// targetPath === ".github/workflows/ci.yml"
```

## Language Detection Heuristics

`detectLanguage` inspects repository paths (accepting `Set<string>`, `TreeEntry[]`, or `RepoTree`):

1. **Manifest & Lockfile Indicators** (checked in priority order):
   - **Node.js**: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `bun.lock`
   - **Python**: `pyproject.toml`, `setup.py`, `setup.cfg`, `requirements.txt`, `Pipfile`, `poetry.lock`
   - **Go**: `go.mod`, `go.sum`
   - **Rust**: `Cargo.toml`, `Cargo.lock`
2. **Fallback Test Conventions** (when no manifest is found):
   - **Node.js**: `*.test.ts`, `*.test.js`, `*.spec.tsx`, etc.
   - **Python**: `test_*.py`, `*_test.py`
   - **Go**: `*_test.go`
   - **Rust**: `*_test.rs`
3. **Generic Fallback**:
   - Returns `"generic"` when no recognized language manifests or test files exist.

## Generated Workflow Actions & Commands

All workflows trigger on `push` and `pull_request` to `main` and `master` (or a caller-specified `defaultBranch`) on `ubuntu-latest`.

| Language | Runtime Setup Action | Test Command | Additional Steps |
| --- | --- | --- | --- |
| **Node.js** | `actions/setup-node@v4` (Node 20, npm cache) | `npm test` | `npm ci \|\| npm install` |
| **Python** | `actions/setup-python@v5` (Python 3.11) | `pytest` | Pip upgrade, `requirements.txt` install, pytest install |
| **Go** | `actions/setup-go@v5` (`stable`) | `go test ./...` | None |
| **Rust** | `actions-rs/toolchain@v1` (`stable`, minimal profile) | `cargo test` | None |
| **Generic** | None (checkout only) | None | Checkout step only |

## Specifications & Invariants

- **Formatting**: Strictly 2-space indented YAML with LF (`\n`) line endings.
- **Purity**: Zero network or filesystem I/O. All generation is pure, synchronous, and deterministic.
- **Validation**: Every template is verified by unit tests to parse cleanly with strict YAML parsers.
