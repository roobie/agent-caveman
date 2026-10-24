---
status: accepted
date: 2026-10-24
read_if:
  - considering re-adding a Chinese or third prose mode
  - touching LEGACY_MODES mappings
refs:
  - src/hooks/caveman-config.js#LEGACY_MODES
---

# D-NIGTH7RYZBDI3NFN Drop megacave rather than keep it dormant

## Context
Megacave was a third prose mode, written in Classical Chinese. The owner cannot read Classical Chinese, so nobody maintaining the fork could judge whether it worked.

## Decision
Remove the mode entirely. Two voices remain, caveman and ultracave. Stored megacave and wenyan values degrade to caveman when read.

## Why
A third mode multiplied the hook, installer and test surface for output the maintainer cannot review. Keeping it dormant would keep all of that surface. Mapping old stored values to caveman means existing sessions keep a working voice instead of failing.

## Consequences
A third prose mode needs a new decision and a maintainer who can read its output. The legacy mappings must stay for as long as old stored values can exist.
