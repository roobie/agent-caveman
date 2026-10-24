---
status: accepted
date: 2026-10-24
read_if:
  - writing install docs or one-liners
  - adding a curl or irm install path
refs:
  - installer/install.js#PINNED_REF
---

# D-PPUBGWQ2I42QVVDM Never promote fetch-and-pipe-into-shell installs

## Context
Upstream docs led with `curl | bash` and `irm | iex`. Owner rejected that style when repointing the docs at this fork.

## Decision
Docs offer only `npx` or a local clone. No download is piped into a shell anywhere in user-facing text.

## Why
Piped scripts run unread and teach users a habit that attackers exploit. The alternatives were keeping the one-liners with a warning, or a download-then-run form. Both still promote the pattern. `npx` pinned to a release tag gives the same one-step install.

## Consequences
Pinned `npx` form is the front-door install. A test fails if README, INSTALL.md or the Windows doc pipe into `bash`, `sh` or `iex`. The shims stay for clone use only.
