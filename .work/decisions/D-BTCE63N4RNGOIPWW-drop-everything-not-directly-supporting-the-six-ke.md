---
status: accepted
date: 2026-10-24
read_if:
  - tempted to restore engine, proxy, packages, mcp, mem, shrink, browse or the CLI
refs:
  - skills/compile.mjs
  - installer/install.js
---

# D-BTCE63N4RNGOIPWW Drop everything not directly supporting the six kept skills

## Context
The fork's owner wants the prose skills and nothing else. Upstream ships a local runtime, provider proxy, memory, output compression and a CLI around them, about 20 MB the owner neither reads nor maintains.

## Decision
Keep only what serves caveman, ultracave, caveman-commit, caveman-review, caveman-compress and cavecrew: hooks, installer, extension, evals, benchmarks. Everything else goes.

## Why
Alternatives were keeping the runtime dormant, or cutting only the skills. Dormant code still has to be understood, tested and patched on every upstream merge, and the owner could not judge it. Cutting skills alone left the larger part of the repo in place.

## Consequences
Diffs against upstream become large and one-sided, so upstream merges will conflict in the deleted trees; resolve by keeping the deletion. Registry generation is a small script in skills/ instead of the CLI. Features that needed the removed parts (stats, explore, shrink, proxy) are gone, not hidden.
