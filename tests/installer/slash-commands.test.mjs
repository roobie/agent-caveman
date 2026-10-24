// Regression for #470 + #571: /caveman-* reports 'Unknown command' in Claude Code.
//
// README.md and INSTALL.md advertise the /caveman-* slash commands, so each one
// must actually resolve in Claude Code and Gemini:
//   commands/<name>.toml  — Gemini CLI extension commands (#470)
//   skills/<name>/SKILL.md OR commands/<name>.md — Claude Code (#571)
//
// The Claude Code half is an EXCLUSIVE or. Claude Code loads commands/*.md as
// flat skills in the same namespace as skills/*/SKILL.md, so shipping both for
// one name registers it twice — `claude plugin details` listed `caveman`,
// `caveman-commit` and `caveman-review` twice each, with a
// 3-line stub competing against the real ruleset for the same slash command.
// #571 predates skills/ being auto-discovered from the plugin root; the stubs
// were the only registration then and are pure duplication now.
//
// Deleting a stub does NOT break hook interception. Verified against Claude
// Code 2.1.235 with a UserPromptSubmit hook that logs its stdin: invoking a
// plugin skill delivers the RAW typed prompt ("/probe:probeskill"), not the
// expanded body. So the mode tracker matches what the user typed, and a stub
// body that re-emitted the command text was never the mechanism.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const COMMANDS_DIR = path.join(REPO_ROOT, 'commands');

// ── #571: Claude Code only discovers commands/*.md ─────────────────────────

// Every command documented for Claude Code. Each needs a .toml (Gemini
// extension) plus exactly one Claude Code provider — a skill directory or a
// flat command .md, never both.
const DOCUMENTED_COMMANDS = ['caveman', 'caveman-commit', 'caveman-review', 'caveman-init'];
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

for (const name of DOCUMENTED_COMMANDS) {
  test(`#571 /${name} is registered in Claude Code exactly once`, () => {
    const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');
    const mdPath = path.join(COMMANDS_DIR, `${name}.md`);
    const providers = [
      fs.existsSync(skillPath) && path.relative(REPO_ROOT, skillPath),
      fs.existsSync(mdPath) && path.relative(REPO_ROOT, mdPath),
    ].filter(Boolean);
    assert.ok(
      providers.length > 0,
      `Nothing registers /${name} for Claude Code — add skills/${name}/SKILL.md or commands/${name}.md, or the chat input is rejected as "Unknown command" (issue #571).`,
    );
    assert.equal(
      providers.length,
      1,
      `/${name} is registered twice (${providers.join(' and ')}). Claude Code loads commands/*.md as flat skills in the same namespace as skills/*/SKILL.md, so the slash command is ambiguous — drop the stub.`,
    );
  });

  test(`#571 commands/${name}.toml still ships for Gemini`, () => {
    assert.ok(
      fs.existsSync(path.join(COMMANDS_DIR, `${name}.toml`)),
      `commands/${name}.toml missing — Gemini CLI extensions only read TOML commands.`,
    );
  });
}

test('#571 command .md bodies use $ARGUMENTS, never the TOML {{args}} placeholder', () => {
  for (const mdPath of fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'))) {
    const body = fs.readFileSync(path.join(COMMANDS_DIR, mdPath), 'utf8');
    assert.ok(body.startsWith('---\n'), `${mdPath} must start with YAML frontmatter (---)`);
    const fm = body.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(fm, `${mdPath} frontmatter must be closed with ---`);
    const desc = fm[1].match(/^description:\s*(.+)$/m);
    assert.ok(desc && desc[1].trim().length > 0, `${mdPath} must declare a non-empty description`);
    assert.ok(
      !body.includes('{{args}}'),
      `commands/${mdPath} contains {{args}} — Claude Code substitutes $ARGUMENTS, {{args}} would reach the model verbatim.`,
    );
  }
});

// #603: the init command must not depend on a repo-relative path — installed
// users run it from their own project, where src/tools/ does not exist.
test('#603 caveman-init command bodies do not run src/tools blindly', () => {
  for (const ext of ['md', 'toml']) {
    const body = fs.readFileSync(path.join(COMMANDS_DIR, `caveman-init.${ext}`), 'utf8');
    if (body.includes('src/tools/caveman-init.js')) {
      assert.ok(
        /raw\.githubusercontent\.com.*caveman-init\.js/.test(body),
        `commands/caveman-init.${ext} references the repo-relative src/tools path without a standalone fallback (curl | node) — fails for every installed user (issue #603).`,
      );
      assert.match(
        body,
        /if .*exists|exists in the current repo/i,
        `commands/caveman-init.${ext} must gate the repo-relative path on the file actually existing (issue #603).`,
      );
    }
  }
});
