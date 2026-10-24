---
created: 2026-10-24
---

# B-JT7QDTNYGYRC2VES Trim README to what matters on first read; show diff lines changed vs upstream up front

## Why
A fork reader needs to know first how far this repo departs from JuliusBrussee/caveman. Today the README is the upstream pitch plus everything that was cut, so the first screen hides the one fact that decides whether to trust it.

## Notes
- Up front and centre: lines added/removed against upstream, measured from the merge base (`git diff --shortstat $(git merge-base HEAD upstream/main) HEAD`) with `upstream` = https://github.com/JuliusBrussee/caveman.git (remote added locally), real numbers only (CLAUDE.md rule on invented figures).
- Do after the big-directory removal slice lands, so the README describes the lean repo and the diff figure is final.
- Keep the caveman voice and the Before/After examples; cut sections for removed products.
