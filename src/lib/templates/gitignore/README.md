# Bundled .gitignore templates

```ts
import { buildPathSet } from "@/src/lib/scoring/utils";
import { detectLanguages, renderGitignore } from "@/src/lib/templates/gitignore";

const paths = buildPathSet(tree);
detectLanguages(paths); // e.g. ["node", "python"]
const content = renderGitignore(paths); // content for the root .gitignore
```

Both utilities are synchronous, pure, and perform no network or filesystem I/O.
Pass lowercased repository-relative paths from `buildPathSet`. Exact manifest
basenames are recognized at any directory depth:

| Language | Manifests |
| --- | --- |
| Node | `package.json` |
| Rust | `Cargo.toml` |
| Go | `go.mod` |
| Python | `setup.py`, `pyproject.toml` |

Detection returns each supported language once in Node → Rust → Go → Python order.
Rendering combines the full detected presets in that order with labeled sections,
LF line endings, and one final newline. Duplicate rules, comments, and negations
are preserved. No manifests, empty trees, and unsupported languages use the generic
fallback, which ignores OS files, logs, temporary files, and local environment
files while allowing `.env.example`.

Nested manifests select language-wide presets; patterns are not rewritten or
scoped to individual project directories. Upstream root-relative patterns retain
their root-relative behavior. All manifest paths count, including vendored ones.
These are general presets: upstream choices such as Python's `lib/` and Go's
`go.work` exclusions apply verbatim and may need project-specific review.

The utilities only generate text. Checking for an existing `.gitignore`, writing
files, and creating PRs are responsibilities of the future remediation engine.

## Provenance

The complete Node, Rust, Go, and Python texts come from
[github/gitignore at commit 361f1e6afa729dc58ec33bf0849772a03ddf6822](https://github.com/github/gitignore/tree/361f1e6afa729dc58ec33bf0849772a03ddf6822).
Each template module links to its immutable source. The upstream project uses
CC0-1.0; its full dedication is included in `LICENSE-CC0.txt`. The generic preset
is maintained locally.

Bundled constants preserve the upstream texts byte for byte. Rendering adds
section headings and normalizes trailing whitespace only at section boundaries.
Tests verify SHA-256 digests against the pinned originals without network access.
When updating presets, review the complete upstream diff and update the revision,
source links, and digests together.
