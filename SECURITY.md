# Security and privacy

This document describes current repository behavior. Published releases can lag
source; verify the tag you install when policy depends on an exact version.

## Supported versions

| Component | Supported line | Security fixes |
|---|---|---|
| Caveman skills, hooks, installer | Latest stable release | Yes |
| Anything older | n/a | No |

Response policy for reports sent through the channel below:

- acknowledgement within 3 business days;
- a fix or mitigation for a confirmed critical issue targeted within 30 days,
  with a published advisory once a fixed version is available.

These are policy targets for a small maintainer team, not a contractual SLA.

## Report a vulnerability

Do not open a public issue for suspected arbitrary code execution, path escape,
credential exposure, or similar security bugs. Use [GitHub private vulnerability
reporting](https://github.com/roobie/agent-caveman/security/advisories/new).

## Data-flow summary

| Surface | Where content goes |
|---|---|
| Skills and hooks | Local agent context and local files. They call no Caveman service and send no telemetry. |
| Installer | Writes files locally. Network requests happen only through the per-agent tools it shells out to (see [INSTALL.md](./INSTALL.md#privacy)). |
| `/caveman-compress` | The file you name goes to your configured model provider. See [`skills/caveman-compress/SECURITY.md`](./skills/caveman-compress/SECURITY.md). |
| Browser extension | Runs locally. No analytics, no prompt content sent to Caveman. |

Your model provider, agent plugins, and any command your agent runs have their
own data handling. Caveman does not change it.

## Install

For inspection-first installation, clone a pinned tag and run the local installer
(`node installer/install.js`) instead of piping a remote script into a shell.
Detached from a checkout, the installer downloads hook files pinned to the
release tag and verifies each against the SHA-256 manifest committed at that tag.
The manifest catches corrupt or partial downloads; because it comes from the same
tag, it cannot detect a tag that was moved.

## Scanner warnings

- Windows Defender or SmartScreen can flag `install.ps1` because it pipes a
  downloaded script into PowerShell and writes agent configuration. Clone and
  inspect the pinned source first if policy forbids pipe-to-shell installation.
- Generic scanners can flag `caveman-compress` because it rewrites the file the
  user names and creates a backup. That file mutation is intentional. Review
  [`skills/caveman-compress/`](./skills/caveman-compress/) before enabling it.
- Snyk Agent Scan W007 ("insecure credential handling") can fire on `caveman`
  and `caveman-compress`. The trigger is the rule that code blocks, commands,
  API names, and exact error strings stay verbatim. That rule stops the model
  from corrupting a stack trace, a command, or a secret while it shortens
  prose. It creates no new place for data to go. The `caveman` skill is
  instructions only: no scripts, no network calls, no extra tool access.
  By default `caveman-compress` sends only the file you name to Anthropic
  (through the API or your `claude` CLI) and writes back only that file and its
  backup. If you opt in with `CAVEMAN_COMPRESS_PROVIDER=opencode` or
  `openai-compat`, the file goes to that provider, or to the endpoint you set in
  `CAVEMAN_COMPRESS_ENDPOINT`, instead (opencode also gets the prompt through a
  temporary file that is deleted afterwards); see
  [`skills/caveman-compress/SECURITY.md`](./skills/caveman-compress/SECURITY.md#auth-behavior).
  Text either skill keeps verbatim is text you already gave the model.
