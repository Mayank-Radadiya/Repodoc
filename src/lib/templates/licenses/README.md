# Bundled license templates

Import `renderLicense` and `SUPPORTED_LICENSE_IDS` from `@/src/lib/templates/licenses`:

```ts
renderLicense("MIT", 2026, "Example Contributors");
```

Rendering is synchronous and uses bundled strings, with no network or filesystem access.
The caller must explicitly select a supported, case-sensitive identifier. There is no
default license. `GPL-3.0` is a compatibility alias for `GPL-3.0-only`; it never grants
an option to use later GPL versions. The exported list includes both spellings.

The year must be an integer from 1000 through 9999. The copyright holder must be
a nonblank, single-line string; surrounding whitespace is trimmed. Invalid values
throw descriptive errors. Names are inserted literally, including dollar signs,
Unicode, and text resembling template placeholders. Output uses LF line endings
and ends with a newline. The utility generates text only; it does not select a
license, write files, or create a remediation PR.

## Provenance

All five complete texts come from [SPDX license-list-data v3.27.0](https://github.com/spdx/license-list-data/tree/v3.27.0),
pinned to commit `d46e94e2c78ceede1cfc63cfa0396472d2798d4c`.
These are the authoritative SPDX texts linked from [Choose a License](https://choosealicense.com/licenses/).
The source links below use the immutable commit, and each template module links to
its original. No upstream texts are downloaded at runtime or during tests.

| License | Pinned source | Attribution changes |
| --- | --- | --- |
| MIT | [MIT.txt](https://github.com/spdx/license-list-data/blob/d46e94e2c78ceede1cfc63cfa0396472d2798d4c/text/MIT.txt) | Replace `<year>` and `<copyright holders>` with `{{year}}` and `{{fullname}}`. |
| Apache-2.0 | [Apache-2.0.txt](https://github.com/spdx/license-list-data/blob/d46e94e2c78ceede1cfc63cfa0396472d2798d4c/text/Apache-2.0.txt) | Replace `[yyyy]` and `[name of copyright owner]` in the appendix notice with the two template tokens. |
| BSD-3-Clause | [BSD-3-Clause.txt](https://github.com/spdx/license-list-data/blob/d46e94e2c78ceede1cfc63cfa0396472d2798d4c/text/BSD-3-Clause.txt) | Replace `<year>` and `<owner>` with the two template tokens; remove the trailing space on that copyright line. |
| GPL-3.0-only | [GPL-3.0-only.txt](https://github.com/spdx/license-list-data/blob/d46e94e2c78ceede1cfc63cfa0396472d2798d4c/text/GPL-3.0-only.txt) | Prepend a project copyright notice with the two tokens, an SPDX identifier, and an explicit version-3-only grant. The complete upstream document is unchanged. |
| MPL-2.0 | [MPL-2.0.txt](https://github.com/spdx/license-list-data/blob/d46e94e2c78ceede1cfc63cfa0396472d2798d4c/text/MPL-2.0.txt) | Prepend a project copyright notice with the two tokens. The complete upstream document is unchanged. |

GPL's FSF copyright and illustrative examples in “How to Apply These Terms to Your
New Programs” remain verbatim, including their example fields and “or later”
wording. Those examples are not the project's grant; the separate introductory
notice specifies version 3 only. MPL retains both exhibits. Apache retains all
nine sections and its appendix. No terms are abbreviated or rewritten.

The unit tests reverse only the documented attribution changes and compare the
entire text's SHA-256 against the pinned originals. When updating upstream texts,
review the complete diff and update the revision, source links, and hashes together.
