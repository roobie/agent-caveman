<!-- UPSTREAM-DIFF:START -->
**1617 files changed, 617 insertions(+), 371444 deletions(-)** vs [upstream](https://github.com/JuliusBrussee/caveman) at merge base `1f951fb`, measured at `a7697f4`.
<!-- UPSTREAM-DIFF:END -->

Figure from `git diff --shortstat $(git merge-base HEAD upstream/main) HEAD` at the commit named above; later commits move it a little. This fork keep the prose skills only.

<div align="center">

<img src="docs/assets/caveman-logo-banner.png" alt="Caveman" width="720">

# why many token when few do trick

**Caveman make your AI agent say less. Code stay exact. Brain still big.**

</div>

<table>
<tr>
<th width="50%">Normal agent · 63 tokens</th>
<th width="50%"><img src="docs/assets/dancing-rock.svg" width="18" height="18" alt=""> Caveman agent · 20 tokens</th>
</tr>
<tr>
<td valign="top">

> The reason your React component is re-rendering is likely because you're creating a new object reference on each render cycle. When you pass an inline object as a prop, React's shallow comparison sees it as a different object every time, which triggers a re-render. I'd recommend using useMemo to memoize the object.

</td>
<td valign="top">

> New object ref each render, so React re-renders. Wrap the prop in `useMemo`.

</td>
</tr>
</table>

**Same fix. 63 token become 20. Brain still big.**

| Skill | Same answer | Tokens |
|---|---|---:|
| `/caveman` | New object ref each render, so React re-renders. Wrap the prop in `useMemo`. | 20 |
| `/ultracave` | Inline object prop, new ref, re-render. `useMemo`. | 14 |

<sub>Token counts: tiktoken o200k.</sub>

## Install

```bash
npx skills add roobie/agent-caveman -g
```

One command. Skills land in every agent the `skills` tool knows. Needs Node.js 18+. One rock. That it.

| Agent | Command |
|---|---|
| Any agent, skills only | `npx skills add roobie/agent-caveman -g` |
| Claude Code plugin (auto-starts every session) | `claude plugin marketplace add roobie/agent-caveman && claude plugin install caveman@caveman` |
| Gemini CLI | `gemini extensions install https://github.com/roobie/agent-caveman` |
| Remove skills | `npx skills remove roobie/agent-caveman -g` |

Type `/caveman` (`$caveman` in Codex) if it doesn't start on its own. Say `stop caveman` to go back.

Per-agent detail, hooks and troubleshooting: [INSTALL.md](./INSTALL.md). Its `npx -y github:...` one-liners and `installer/install.js` still fetch skills from the original repo, not this fork.

## What you get

| Piece | What it does |
|---|---|
| `/caveman` | The voice. Answer first, no ceremony, code and errors verbatim. `/caveman status` shows the mode |
| `/ultracave` | The grunt. Grammar stripped harder |
| `/caveman-commit` | Terse Conventional Commit message |
| `/caveman-review` | One finding per line: `L42: 🔴 bug: user null. Guard it.` |
| `/caveman-compress <file>` | Shrinks memory files like `CLAUDE.md`, keeps a backup. Sends the file to your model provider |
| `cavecrew` | Guide for handing work to the three subagents below |
| `cavecrew-investigator` | Finds code, reports `path:line` |
| `cavecrew-builder` | Small edits in one or two files |
| `cavecrew-reviewer` | Reviews a diff, one line per finding |

Caveman drop to full sentences for security warnings, irreversible actions and confused users. Then grunt resumes.

## Numbers

Ten dev questions on claude-opus-5-5:

| Instruction | Output tokens |
|---|---:|
| None | 6983 |
| `Answer concisely.` | 4334 |
| `/caveman` | 4119 |
| `/ultracave` | **2693** |

"Be concise" is the real baseline. On top of it, `/caveman` cuts 3% more at the median and `/ultracave` 35% more. Measured on the 3.1.0 rules, not yet re-run. `/caveman-compress` on five fixture files: 6198 tokens become 4138. [Harness](./evals/README.md) · [Compress bench](./skills/caveman-compress/README.md#benchmarks) · [Every case where caveman loses](./docs/HONEST-NUMBERS.md)

<!-- BENCHMARK-TABLE-START -->
<!-- BENCHMARK-TABLE-END -->

## Privacy

Skills and hooks run on your machine and send nothing. One exception: `/caveman-compress` sends the file you compress to your configured model provider. Full list: [SECURITY.md](./SECURITY.md).

## License

[Apache-2.0](./LICENSE). Older releases and third-party notices: [LICENSING.md](./LICENSING.md).

<sub><a href="./INSTALL.md">Install matrix</a> · <a href="./CONTRIBUTING.md">Contributing</a></sub>
