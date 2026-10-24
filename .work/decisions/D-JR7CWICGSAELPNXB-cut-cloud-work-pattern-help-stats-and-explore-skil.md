---
status: accepted
date: 2026-10-24
read_if:
  - considering re-adding a Caveman Cloud driver skill or a generic work-pattern skill
  - adding a directory under skills/
refs:
  - skills
---

# D-JR7CWICGSAELPNXB Cut cloud, work-pattern, help, stats and explore skills; keep voice, commit, review, compress, cavecrew

## Context
The fork inherited many skills and a runtime around them. The owner wanted the repo lean: only what directly supports the kept skills.

## Decision
Keep the caveman and ultracave voices, caveman-commit, caveman-review, caveman-compress and cavecrew. Cut the Caveman Cloud driver, work-pattern, help, stats and explore skills.

## Why
Every directory under `skills/` is auto-discovered and installed for every plugin user, where its description competes for activation on ordinary work. A skill that does not serve the voice or its helpers costs every user attention and costs the maintainer test and install surface. The stats skill also reported savings with no measured baseline behind them. The alternative, keeping the cut skills dormant, still ships them.

## Consequences
Re-adding any of them needs a new decision that says why it now earns its place. The stats recorder and its hook are gone, and uninstall still strips the old hook entry so existing installs clean up.
