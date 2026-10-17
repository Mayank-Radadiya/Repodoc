# Security Policy Template

Import `renderSecurityPolicy` and related types/constants from `@/src/lib/templates/security`:

```ts
import { renderSecurityPolicy } from "@/src/lib/templates/security";

// Default rendering with sensible defaults
const markdown = renderSecurityPolicy();

// Customized rendering
const customMarkdown = renderSecurityPolicy({
  projectName: "Repodoc",
  contact: "security@repodoc.dev",
  responseSla: "24 hours",
  supportedVersions: [
    { version: "1.x", supported: true, notes: "Current stable release" },
    { version: "0.x", supported: false, notes: "End of life" },
  ],
});
```

Rendering is synchronous and pure, using bundled templates with zero network or filesystem access.
Every call produces complete, valid markdown with all placeholder tokens cleanly resolved. No raw `{{...}}`, `<...>`, or `[TODO]` tokens remain in the output.

## Options Reference

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `projectName` | `string` | `"this project"` | Display name of the project or repository. |
| `contact` | `string` | *(GitHub Advisories instruction)* | Direct vulnerability reporting contact. Formatted automatically as email `mailto:` or URL link. |
| `supportedVersions` | `SupportedVersionRow[]` | *(Latest vs Prior table)* | Array of `{ version, supported, notes? }` rows rendered as a Markdown table. |
| `responseSla` | `string` | `"48 hours"` | Acknowledgment timeframe for new vulnerability reports. |
| `additionalInfo` | `string` | `undefined` | Optional extra details (e.g. PGP public key link, bug bounty program). |

## Provenance & Standards

The template follows industry best practices and GitHub's recommended security policy format:
- [GitHub: Adding a security policy to your repository](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository)
- [GitHub: Privately reporting a security vulnerability](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-communicating-vulnerabilities/privately-reporting-a-security-vulnerability)
- Coordinated Vulnerability Disclosure (CVD) principles.

## Rubric Integration

Rendered output from `renderSecurityPolicy()` is guaranteed to pass Repodoc's Rubric v1.0 Security Baseline check (`checkSecurityPolicy` in `src/lib/scoring/checks/security.ts`), awarding the full 10/10 points.
