# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in DomoScope, please do not disclose it publicly in issues. Please send an advisory through GitHub Security Advisories or contact the maintainers.

## Safe Handling of Repositories

DomoScope treats all external GitHub repository source code as untrusted reference data:
- DomoScope never executes repository code (no `npm install`, no `eval`, no shell scripts).
- Content is parsed safely in the browser without server-side execution.
- Prompts passed to local WebLLM treat repository content strictly as untrusted data within sandbox tags.
