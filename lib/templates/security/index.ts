import { SECURITY_POLICY_TEMPLATE } from "./template";

export { SECURITY_POLICY_TEMPLATE } from "./template";

export const SECURITY_POLICY_TARGET_PATH = "SECURITY.md" as const;
export const DEFAULT_PROJECT_NAME = "this project" as const;
export const DEFAULT_RESPONSE_SLA = "48 hours" as const;

export interface SupportedVersionRow {
  readonly version: string;
  readonly supported: boolean;
  readonly notes?: string;
}

export interface SecurityPolicyOptions {
  /** Project or repository name (defaults to "this project") */
  readonly projectName?: string;
  /** Direct contact email or disclosure URL */
  readonly contact?: string;
  /** Custom table rows for supported versions */
  readonly supportedVersions?: readonly SupportedVersionRow[];
  /** Expected initial acknowledgment window (defaults to "48 hours") */
  readonly responseSla?: string;
  /** Additional guidance or preferred PGP key URL (optional) */
  readonly additionalInfo?: string;
}

function formatSupportedVersions(
  versions?: readonly SupportedVersionRow[],
): string {
  const rows =
    versions && versions.length > 0
      ? versions
      : [
          {
            version: "Latest release",
            supported: true,
            notes: "Actively supported with security updates",
          },
          {
            version: "Prior releases",
            supported: false,
            notes: "Not supported; please upgrade to the latest release",
          },
        ];

  const header = "| Version | Supported | Notes |\n| ------- | :-------: | ----- |";
  const tableRows = rows.map((r) => {
    const icon = r.supported ? ":white_check_mark:" : ":x:";
    const notes = r.notes ? r.notes.trim() : "";
    return `| ${r.version.trim()} | ${icon} | ${notes} |`;
  });

  return [header, ...tableRows].join("\n");
}

function formatContactInstructions(contact?: string): string {
  if (!contact) {
    return (
      "To report a security vulnerability, please use [GitHub Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-communicating-vulnerabilities/privately-reporting-a-security-vulnerability) via the repository's **Security Advisories** tab, or reach out directly to the repository maintainers."
    );
  }

  const trimmed = contact.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const isUrl = /^https?:\/\//i.test(trimmed);

  if (isEmail) {
    return `To report a security vulnerability, please send an email to [${trimmed}](mailto:${trimmed}). Please encrypt your message if sensitive details require it.`;
  }

  if (isUrl) {
    return `To report a security vulnerability, please submit an advisory through [${trimmed}](${trimmed}).`;
  }

  return `To report a security vulnerability, please contact: ${trimmed}.`;
}

function formatAdditionalInfo(additionalInfo?: string): string {
  if (!additionalInfo) {
    return "";
  }
  const trimmed = additionalInfo
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  if (trimmed.length === 0) {
    return "";
  }
  return `\n\n## Additional Security Information\n\n${trimmed}`;
}

/**
 * Render a complete, valid SECURITY.md markdown document with all placeholders resolved.
 *
 * Synchronous and pure with zero network or filesystem calls.
 */
export function renderSecurityPolicy(options?: SecurityPolicyOptions): string {
  if (options !== undefined) {
    if (
      typeof options !== "object" ||
      options === null ||
      Array.isArray(options)
    ) {
      throw new TypeError("Security policy options must be an object or undefined.");
    }
  }

  let projectName: string = DEFAULT_PROJECT_NAME;
  if (options?.projectName !== undefined) {
    if (typeof options.projectName !== "string") {
      throw new TypeError("Project name must be a string.");
    }
    if (/[\r\n\u2028\u2029]/.test(options.projectName)) {
      throw new TypeError("Project name must be a single-line string.");
    }
    const trimmed = options.projectName.trim();
    if (trimmed.length > 0) {
      projectName = trimmed;
    }
  }

  let contact: string | undefined = undefined;
  if (options?.contact !== undefined) {
    if (typeof options.contact !== "string") {
      throw new TypeError("Contact must be a string.");
    }
    if (/[\r\n\u2028\u2029]/.test(options.contact)) {
      throw new TypeError("Contact must be a single-line string.");
    }
    const trimmed = options.contact.trim();
    if (trimmed.length > 0) {
      contact = trimmed;
    }
  }

  let responseSla: string = DEFAULT_RESPONSE_SLA;
  if (options?.responseSla !== undefined) {
    if (typeof options.responseSla !== "string") {
      throw new TypeError("Response SLA must be a string.");
    }
    if (/[\r\n\u2028\u2029]/.test(options.responseSla)) {
      throw new TypeError("Response SLA must be a single-line string.");
    }
    const trimmed = options.responseSla.trim();
    if (trimmed.length > 0) {
      responseSla = trimmed;
    }
  }

  if (options?.supportedVersions !== undefined) {
    if (!Array.isArray(options.supportedVersions)) {
      throw new TypeError("supportedVersions must be an array.");
    }
    for (const item of options.supportedVersions) {
      if (typeof item !== "object" || item === null) {
        throw new TypeError("Each supported version entry must be an object.");
      }
      if (
        typeof item.version !== "string" ||
        /[\r\n\u2028\u2029]/.test(item.version)
      ) {
        throw new TypeError("Each version must be a single-line string.");
      }
      if (typeof item.supported !== "boolean") {
        throw new TypeError("Each supported entry must have a boolean supported property.");
      }
      if (
        item.notes !== undefined &&
        (typeof item.notes !== "string" || /[\r\n\u2028\u2029]/.test(item.notes))
      ) {
        throw new TypeError("Version notes must be a single-line string when provided.");
      }
    }
  }

  if (
    options?.additionalInfo !== undefined &&
    typeof options.additionalInfo !== "string"
  ) {
    throw new TypeError("additionalInfo must be a string when provided.");
  }

  const supportedVersionsText = formatSupportedVersions(
    options?.supportedVersions,
  );
  const contactText = formatContactInstructions(contact);
  const additionalInfoText = formatAdditionalInfo(options?.additionalInfo);

  const rendered = SECURITY_POLICY_TEMPLATE.replace(
    /\{\{project\}\}/g,
    () => projectName,
  )
    .replace(/\{\{supported_versions\}\}/g, () => supportedVersionsText)
    .replace(/\{\{contact_instructions\}\}/g, () => contactText)
    .replace(/\{\{response_sla\}\}/g, () => responseSla)
    .replace(/\{\{additional_info_section\}\}/g, () => additionalInfoText);

  // Normalize all line endings to UNIX LF and ensure trailing newline
  const normalized = `${rendered.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd()}\n`;

  return normalized;
}
