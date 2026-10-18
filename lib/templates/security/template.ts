export const SECURITY_POLICY_TEMPLATE = `# Security Policy for {{project}}

The team takes the security of {{project}} seriously. We appreciate your efforts to responsibly disclose vulnerabilities.

## Supported Versions

Please refer to the table below for the status of actively supported security releases:

{{supported_versions}}

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

{{contact_instructions}}

## What to Include in a Report

To help us investigate and resolve the issue quickly, please include as much of the following details as possible:

- **Summary:** A clear and descriptive summary of the vulnerability.
- **Affected Version:** The version(s) of the software affected.
- **Steps to Reproduce:** Exact, reproducible steps or scripts showing the vulnerability.
- **Proof of Concept (PoC):** Non-destructive reproduction steps or screenshots.
- **Impact:** An assessment of how an attacker could exploit this vulnerability.
- **Potential Fix:** Any proposed remediations or mitigation steps (optional).

## Preferred Disclosure Process

1. **Initial Acknowledgment:** We aim to acknowledge receipt of your vulnerability report within {{response_sla}}.
2. **Assessment:** We will confirm whether the issue is valid, assess its severity, and determine next steps.
3. **Remediation:** A patch or fix will be developed and tested privately.
4. **Coordinated Disclosure:** We will coordinate the release date with you and publish an advisory alongside the patched release.
{{additional_info_section}}`;
