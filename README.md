<div align="center">

<img src="docs/assets/caveman-logo-banner.png" alt="Caveman" width="720">

# why many token when few do trick

**Caveman make your AI agent say less. Code stay exact. Brain still big.**

<a href="https://github.com/JuliusBrussee/caveman/stargazers"><img src="https://img.shields.io/github/stars/JuliusBrussee/caveman?style=flat-square&color=F0A63C&label=stars" alt="GitHub stars"></a>
<a href="./INSTALL.md"><img src="https://img.shields.io/badge/works_with-30%2B_agents-orange?style=flat-square" alt="30+ agents"></a>
<a href="#license"><img src="https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square" alt="License"></a>

Cited by **[Adobe Research](https://arxiv.org/abs/2606.24083)** · A/B tested by **[JetBrains](https://blog.jetbrains.com/ai/2026/07/speak-to-ai-agents-like-cavemen-tosave-tokens/)** · Remade for Elasticsearch on **[Elasticsearch Labs](https://www.elastic.co/search-labs/blog/elastic-caveman-ai-token-reduction)**<br>
**#1** on [Hacker News](https://news.ycombinator.com/item?id=47647455) · **#1** on GitHub Trending · *"No way this actually works."* [ThePrimeagen](https://www.youtube.com/watch?v=L29q2LRiMRc)

**[Install](#install) · [Proof](#proof) · [Say less](#say-less-the-caveman-voice) · [Commands](#commands)**

</div>

---

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

Pick your club:

| Skill | Same answer | Tokens |
|---|---|---:|
| `/caveman` | New object ref each render, so React re-renders. Wrap the prop in `useMemo`. | 20 |
| `/ultracave` | Inline object prop, new ref, re-render. `useMemo`. | 14 |

<sub>Token counts: tiktoken o200k.</sub>

## Install

```bash
npx -y github:JuliusBrussee/caveman
```

One command. Mac, Linux, Windows. Caveman find your agents, put the skill in each, show what it change. Works with Claude Code, Codex, Gemini CLI, OpenCode, and [30+ more](./INSTALL.md). Needs Node.js 18+. One rock. That it.

Only want the skill, nothing else?

```bash
npx skills add JuliusBrussee/caveman -g
```

<a href="https://skills.sh/JuliusBrussee/caveman"><img src="https://skills.sh/b/JuliusBrussee/caveman" alt="skills.sh"></a>

Type `/caveman` (`$caveman` in Codex) if it doesn't start on its own. Say `stop caveman` to go back.

<details>
<summary><strong>Other ways in</strong>: Claude app and phone, Claude Code plugin, Gemini, every agent at once, Windows, uninstall</summary>

<br>

Claude on the web, the phone app, or Cowork? No terminal. Add caveman to your Claude account once, in Customize > Plugins: [steps](./INSTALL.md#claude-apps-claudeai-desktop-mobile-cowork). Not tested end to end yet.

```bash
# Claude Code plugin, auto-starts every interactive session, subagents too
claude plugin marketplace add JuliusBrussee/caveman && claude plugin install caveman@caveman

# Gemini CLI
gemini extensions install https://github.com/JuliusBrussee/caveman

# Every agent on your machine at once, plus the Claude Code statusline badge
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/v4.0.1/install.sh | bash
```

Already inside Claude Code? Same rock, slash form. Type these where you talk to Claude:

```text
/plugin marketplace add JuliusBrussee/caveman
/plugin install caveman@caveman
```

Windows, PowerShell 5.1+:

```powershell
irm https://raw.githubusercontent.com/JuliusBrussee/caveman/v4.0.1/install.ps1 | iex
```

On npm 12 or newer, new npm block git install. One-liners above handle it themselves from v3.2.0 on. Old one-liner pinned to v3.1.0 or older still fail there: use one above, or this:
`npx --allow-git=root -y github:JuliusBrussee/caveman#v4.0.1`

Changed your mind: `npx -y github:JuliusBrussee/caveman -- --uninstall` (on npm 12+, add `--allow-git=root` too)

Only grabbed the skill? `npx skills remove JuliusBrussee/caveman -g` take it back out.

Install broke? Open your agent in this repo and say *"Read CLAUDE.md and INSTALL.md, install caveman for me."* Agent fix own brain.

</details>

## Proof

Outside labs first. Nothing rounded up. Red rows stay red.

| Who | Setup | Result |
|---|---|---|
| **[Adobe Research](https://arxiv.org/abs/2606.24083)**, CAVEWOMAN paper (cites this repo) | Caveman-style output, eight models, five datasets | **Cost cut 1.4 to 2.4× per model, up to 3×** |
| **[Elastic](https://www.elastic.co/search-labs/blog/elastic-caveman-ai-token-reduction)**, Elasticsearch Labs | Caveman mode remade for Elasticsearch, eight live MCP scenarios | **63.6% fewer response tokens.** *"Zero information loss."* |
| **[JetBrains](https://blog.jetbrains.com/ai/2026/07/speak-to-ai-agents-like-cavemen-tosave-tokens/)** | 86 real coding tasks, paired A/B | **No measurable quality loss** (p = 0.82). 8.5% fewer output tokens |

Two findings shaped caveman. Adobe: cavemanning *your* prompt makes answers worse, so caveman never touches your prompt. JetBrains: agent sessions are mostly code and tool calls, which the voice leaves alone.

## Say less: the caveman voice

**A voice, not broken grammar. Every reply follows the same structure.**

| Rule | What it means |
|---|---|
| **Answer first** | `[thing] [action] [reason]. [next step].` No greeting, no "let me", no recap |
| **One idea per sentence** | Built on [ASD-STE100](https://www.asd-ste100.org/), the controlled English of aircraft maintenance manuals: 20 words max, active voice, one term per thing |
| **Meaning never dropped** | Articles can go. *not*, *never*, *no*, *only* never go. Numbers and units stay exact |
| **Payload verbatim** | Code, commands, paths, and error messages untouched, character for character |
| **No theater** | No "me think". No chatter between tool calls. If caveman phrasing isn't shorter, plain wins |
| **Knows when to stop** | Security warnings, irreversible actions, and confused users get full sentences. Then grunt resumes |
| **Your prompts stay yours** | Never rewritten. [Research say that backfire](#proof) |

Ten dev questions on claude-opus-5-5:

| Instruction | Output tokens |
|---|---:|
| None | 6,983 |
| `Answer concisely.` | 4,334 |
| `/caveman` | 4,119 |
| `/ultracave` | **2,693** |

"Be concise" is the real baseline; new models already know it. On top of it, `/caveman` cuts 3% more at the median and `/ultracave` 35% more. Measured on the 3.1.0 rules, not yet re-run. The rules cost about 1,160 tokens of input, and if you pay per request (GitHub Copilot), shorter answers save nothing. [Harness](./evals/README.md) · [Every case where caveman loses](./docs/HONEST-NUMBERS.md)

<!-- BENCHMARK-TABLE-START -->
<!-- BENCHMARK-TABLE-END -->

## Commands

| Command | What it does |
|---|---|
| `/caveman` · `/ultracave` | The voice, the grunt. `/caveman status` shows the mode, `/caveman off` stops it |
| `/caveman-commit` | One-line Conventional Commit |
| `/caveman-review` | One finding per line: `L42: 🔴 null deref. Guard it.` |
| `/caveman-compress <file>` | Shrinks memory files like `CLAUDE.md`, keeps a backup. **4,138 tokens instead of 6,198** across five files, 22.8% to 49.1% each, every heading, code block, and path intact. [Bench](./skills/caveman-compress/README.md#benchmarks) |
| `cavecrew` | Subagents that find, edit, and review code, then report back in caveman |

## In the wild

<a href="https://www.youtube.com/watch?v=L29q2LRiMRc"><img src="https://img.youtube.com/vi/L29q2LRiMRc/hqdefault.jpg" alt="ThePrimeagen reacts to Caveman: No way this actually works" width="340" align="right"></a>

**ThePrimeagen**: *"No way this actually works."* [Watch](https://www.youtube.com/watch?v=L29q2LRiMRc)

**Adobe Research**: [CAVEWOMAN](https://arxiv.org/abs/2606.24083), arXiv, June 2026

**JetBrains**: *"It is fun, and it costs you nothing measurable in quality."* [Read](https://blog.jetbrains.com/ai/2026/07/speak-to-ai-agents-like-cavemen-tosave-tokens/)

**Elastic**: [elastic-caveman](https://www.elastic.co/search-labs/blog/elastic-caveman-ai-token-reduction) on Elasticsearch Labs, April 2026

**Hacker News**: [#1, 904 points](https://news.ycombinator.com/item?id=47647455)

**GitHub Trending** #1 overall, July 2026 · **[Trendshift](https://trendshift.io/repositories/25391)** #1 repo of the day, April 2026 · **[Product Hunt](https://www.producthunt.com/products/caveman)** #8 of the day

Started as a joke in April 2026. Now past 100,000 stars. Joke got serious. Voice did not.

<br clear="right">

[![Star History Chart](./docs/assets/star-history.png)](https://star-history.com/#JuliusBrussee/caveman&Date)

## Privacy

The skill and hooks run on your machine and send nothing. One exception: `/caveman-compress` sends the file you compress to your configured model provider. The full list: [SECURITY.md](./SECURITY.md).

## License

[Apache-2.0](./LICENSE), whole repo. Read it, fork it, ship it, host it. Free like mammoth on open plain. Older releases and third-party notices: [LICENSING.md](./LICENSING.md). "Caveman" and the rock logo are trademarks of Julius Brussee.

## Cite

```bibtex
@software{brussee2026caveman,
  author = {Brussee, Julius},
  title  = {Caveman: why many token when few do trick},
  year   = {2026},
  url    = {https://github.com/JuliusBrussee/caveman}
}
```

---

<div align="center">

🪨 **Caveman save you token. Star cost zero. Fair trade.**

<sub>
<a href="./docs/README.md">Docs</a> ·
<a href="./INSTALL.md">Install matrix</a> ·
<a href="./docs/HONEST-NUMBERS.md">Honest numbers</a> ·
<a href="./CONTRIBUTING.md">Contributing</a> ·
<a href="https://github.com/JuliusBrussee/caveman/issues">Issues</a>
</sub>

</div>
