# Install and update

Caveman ships one installer. It places skills, and for hosts that support them,
hooks and a statusline.

## Requirements

| Surface | Minimum runtime |
|---|---|
| Installer | Node.js 18 |
| Browser extension development | Node.js plus pinned Playwright dependencies |

## Install

Run installer directly from GitHub:

```bash
npx -y github:JuliusBrussee/caveman
```

It detects installed agents and installs only matching integrations. List every
known target:

```bash
npx -y github:JuliusBrussee/caveman -- --list
```

Install one target:

```bash
npx -y github:JuliusBrussee/caveman -- --only claude
npx -y github:JuliusBrussee/caveman -- --only codex
```

Claude Code uses its plugin system, while Gemini CLI uses its extension system.
opencode and OpenClaw have native installers; skills-compatible hosts
use external Skills CLI, and targets labeled `soft` require `--only` because
local detection is unreliable.

Useful installer controls:

| Flag | Effect |
|---|---|
| `--dry-run` | Print commands and writes without changing state |
| `--force` | Reinstall an existing target |
| `--minimal` | Install plugin or extension without hooks or project rules |
| `--with-hooks` / `--no-hooks` | Control Claude Code hooks |
| `--with-init` | Write current-project rule files |
| `--non-interactive` | Disable prompts |
| `--config-dir <path>` | Select Claude Code hook/config directory |

Full command reference lives in [`INSTALL.md`](../../INSTALL.md).

## Update

Skill/plugin updates follow host's plugin or Skills CLI update flow. Re-running
GitHub installer is idempotent for installer-owned files.

## Uninstall

```bash
npx -y github:JuliusBrussee/caveman -- --uninstall
```

## Windows notes

PowerShell 5.1+ can run root installer shim. Skills CLI may need
`--copy` when symlink creation is unavailable. See
[Windows fallback](../install-windows.md) for manual plugin recovery.
