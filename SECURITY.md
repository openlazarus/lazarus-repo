# Security Policy

## Supported Versions

Only the `main` branch is currently supported with security updates. Please ensure you are running the latest commit before reporting issues.

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public GitHub issue. Instead, report it privately by emailing:

**security@openlazarus.ai**

Please include the following details where possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code, requests, or screenshots)
- Affected component, file path, or endpoint
- Any suggested remediation

We aim to acknowledge reports within **3 business days** and will keep you updated as we investigate and remediate.

## Scope

### In scope
- Backend API (`packages/lazarus-api`)
- Frontend application (`packages/lazarus-ui`)
- Authentication, authorization, and workspace isolation logic
- Secret handling and input validation
- Dependency vulnerabilities with a demonstrable exploit path

### Out of scope
- Social engineering and physical attacks
- Denial-of-service via volumetric traffic
- Third-party services we integrate with (report to the respective vendor)
- Issues requiring a rooted device, jailbroken browser, or physical access
- Automated scanner output without a proven impact

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts they own or have explicit permission to test
- Give us reasonable time to remediate before any public disclosure

Thank you for helping keep Lazarus and its users safe.
