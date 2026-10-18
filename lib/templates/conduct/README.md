# Bundled Code of Conduct template

```ts
import {
  renderCodeOfConduct,
  CONTRIBUTOR_COVENANT_V2_1,
  CODE_OF_CONDUCT_VERSION,
} from "@/lib/templates/conduct";

// Canonical template with default [INSERT CONTACT METHOD] placeholder:
const defaultText = renderCodeOfConduct();

// Or customized with an explicit reporting contact method:
const customizedText = renderCodeOfConduct("conduct@example.com");
// or:
const customWithOptions = renderCodeOfConduct({
  contactMethod: "https://example.com/conduct-report",
});
```

The rendering utility is synchronous, pure, and performs no network or filesystem I/O.
It bundles the complete text of Contributor Covenant version 2.1, the industry standard
code of conduct for open-source communities.

## API

### `renderCodeOfConduct(options?: string | { contactMethod?: string }): string`

- When called without arguments or with `undefined`, returns the verbatim Contributor Covenant v2.1 text containing the standard `[INSERT CONTACT METHOD]` reporting placeholder.
- When `contactMethod` is provided (either as a string or via `{ contactMethod: string }`), replaces `[INSERT CONTACT METHOD]` with the provided string.
- Contact methods must be nonblank, single-line strings; surrounding whitespace is trimmed.
- Throws `TypeError` if invalid types, blank strings, or multiline strings are passed.
- Substitution treats replacement strings literally without interpreting special regex substitution tokens (e.g. `$&`, `$1`).
- Preserves LF line endings (`\n`) and terminates with a final newline.

### Constants

- `CONTRIBUTOR_COVENANT_V2_1`: Immutable string containing the full markdown text of Contributor Covenant v2.1.
- `CODE_OF_CONDUCT_VERSION`: `"2.1"`
- `DEFAULT_CONTACT_PLACEHOLDER`: `"[INSERT CONTACT METHOD]"`

## Provenance

The canonical markdown text comes from the official Contributor Covenant repository:
- Repository: [EthicalSource/contributor_covenant](https://github.com/EthicalSource/contributor_covenant)
- Commit: [`7255a28d23d5bc296de2e4e4e9bb5ee1126f1345`](https://github.com/EthicalSource/contributor_covenant/blob/7255a28d23d5bc296de2e4e4e9bb5ee1126f1345/content/version/2/1/code_of_conduct.md)
- Canonical URL: [https://www.contributor-covenant.org/version/2/1/code_of_conduct/](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)
- License: Creative Commons Attribution 4.0 International ([CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)) by [Contributor Covenant](https://www.contributor-covenant.org) authors.

The bundled template preserves the official upstream markdown body verbatim, omitting only the Hugo static-site generator frontmatter (`+++ ... +++`).
The integrity of the template is verified via SHA-256 digest (`369bf7301883368fc19203bd0f1233fed2b83f0378ad19c4d0708bf61925339b`) in automated tests.
