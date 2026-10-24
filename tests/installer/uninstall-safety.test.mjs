// Uninstall must never leave settings.json pointing at hook scripts it deleted,
// and neither install nor uninstall may touch a hooks/package.json another
// plugin owns.
//
// Both are the same class of bug: installer/install.js treating shared, user-owned
// state in $CLAUDE_CONFIG_DIR/hooks as if caveman owned it outright.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isolatedEnv as isolatedHome } from './_isolated-env.mjs';
import { nodeStub, stubEnv } from '../harness/stub-bin.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const INSTALLER = path.join(REPO_ROOT, 'installer', 'install.js');

function freshTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-uninstall-safety-'));
}

function fakeClaudeDir(root) {
  const dir = path.join(root, 'fake-bin');
  fs.mkdirSync(dir, { recursive: true });
  if (process.platform === 'win32') {
    // A Node-backed shim: the installer refuses to launch any other .cmd.
    fs.writeFileSync(path.join(dir, 'claude.js'), 'process.exit(0);\n');
    fs.writeFileSync(path.join(dir, 'claude.cmd'), '@echo off\r\n"%~dp0\\node.exe" "%~dp0\\claude.js" %*\r\n');
  } else {
    const file = path.join(dir, 'claude');
    fs.writeFileSync(file, '#!/bin/sh\nexit 0\n');
    fs.chmodSync(file, 0o755);
  }
  return dir;
}

// A throwaway home, and a PATH with only the stubs and system dirs, so the
// installer never reaches the user's real plugin, extension or native-agent
// state.
function isolatedEnv(root, extraBinDirs = []) {
  return isolatedHome(path.join(root, 'home'), [fakeClaudeDir(root), ...extraBinDirs]);
}

function runInstaller(args, configDir, extraEnv) {
  return spawnSync(process.execPath, [INSTALLER, ...args, '--config-dir', configDir, '--non-interactive'], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir, NO_COLOR: '1', ...extraEnv },
    encoding: 'utf8',
  });
}

// A settings.json the JSONC-tolerant reader still cannot parse, so readSettings
// returns null and the hook-removal block is skipped entirely.
const UNPARSEABLE = '{ "hooks": { "SessionStart": [ , ] }';

test('uninstall keeps the hook files when settings.json cannot be updated', () => {
  const dir = freshTmpDir();
  const configDir = path.join(dir, 'claude');
  const env = isolatedEnv(dir);
  try {
    const installed = runInstaller(['--only', 'claude', '--with-hooks'], configDir, env);
    assert.equal(installed.status, 0, installed.stderr || installed.stdout);
    const activate = path.join(configDir, 'hooks', 'caveman-activate.js');
    assert.ok(fs.existsSync(activate), 'setup: the hook was never installed');

    fs.writeFileSync(path.join(configDir, 'settings.json'), UNPARSEABLE);
    const removed = runInstaller(['--uninstall'], configDir, env);

    // Deleting the scripts here strands the entries settings.json still holds:
    // Claude Code then dies with `Cannot find module …caveman-activate.js` on
    // every session start (#471).
    assert.ok(fs.existsSync(activate), 'uninstall deleted a hook settings.json may still reference');
    assert.notEqual(removed.status, 0, 'a cleanup that could not finish must not exit 0');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('uninstall leaves a settings.json without caveman entries untouched', () => {
  const dir = freshTmpDir();
  const configDir = path.join(dir, 'claude');
  const env = isolatedEnv(dir);
  const settingsPath = path.join(configDir, 'settings.json');
  try {
    fs.mkdirSync(configDir, { recursive: true });
    const mine = '{\n  // my note\n  "model": "opus",\n  "hooks": {},\n  "statusLine": {"type": "command", "command": "~/bin/s.sh",},\n}\n';
    fs.writeFileSync(settingsPath, mine);
    const r = runInstaller(['--uninstall'], configDir, env);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.equal(fs.readFileSync(settingsPath, 'utf8'), mine, 'uninstall rewrote a settings.json caveman never touched');
    assert.equal(fs.existsSync(`${settingsPath}.bak`), false);

    const hook = path.join(configDir, 'hooks', 'caveman-activate.js');
    const withHook = `{\n  // my note\n  "hooks": {"SessionStart": [{"hooks": [{"type": "command", "command": ${JSON.stringify(`node ${hook}`)}}]}]},\n}\n`;
    fs.writeFileSync(settingsPath, withHook);
    const r2 = runInstaller(['--uninstall'], configDir, env);
    assert.equal(r2.status, 0, r2.stderr || r2.stdout);
    assert.deepEqual(JSON.parse(fs.readFileSync(settingsPath, 'utf8')), {});
    assert.equal(fs.readFileSync(`${settingsPath}.bak`, 'utf8'), withHook, 'commented original not kept');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("install and uninstall leave another plugin's hooks/package.json alone", () => {
  const dir = freshTmpDir();
  const configDir = path.join(dir, 'claude');
  const env = isolatedEnv(dir);
  const foreign = '{\n  "type": "module",\n  "name": "some-other-plugin"\n}\n';
  try {
    const hooks = path.join(configDir, 'hooks');
    fs.mkdirSync(hooks, { recursive: true });
    const manifest = path.join(hooks, 'package.json');
    fs.writeFileSync(manifest, foreign);

    const installed = runInstaller(['--only', 'claude', '--with-hooks'], configDir, env);
    assert.equal(installed.status, 0, installed.stderr || installed.stdout);
    assert.equal(fs.readFileSync(manifest, 'utf8'), foreign, 'install overwrote a foreign hooks/package.json');

    runInstaller(['--uninstall'], configDir, env);
    assert.equal(fs.readFileSync(manifest, 'utf8'), foreign, 'uninstall deleted a foreign hooks/package.json');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Node gives every .js in hooks/ the module type of hooks/package.json. When
// another plugin's manifest says "module", caveman's CommonJS hooks crash on
// every event, so wiring them only adds errors while reporting success.
test("standalone hooks refuse a foreign hooks/package.json that says type:module", () => {
  const dir = freshTmpDir();
  const configDir = path.join(dir, 'claude');
  const env = isolatedEnv(dir);
  try {
    fs.mkdirSync(path.join(configDir, 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(configDir, 'hooks', 'package.json'), '{"type": "module"}\n');
    const r = runInstaller(['--only', 'claude', '--with-hooks'], configDir, env);
    assert.match(r.stderr, /claude-hooks — .*"type":"module"/, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /• claude-hooks/);
    assert.equal(fs.existsSync(path.join(configDir, 'settings.json')), false, 'hooks wired that cannot load');
    assert.equal(fs.existsSync(path.join(configDir, 'hooks', 'caveman-activate.js')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// addCommandHook refuses to overwrite a hook event it does not understand. That
// refusal must come back as a failed claude-hooks, not a stack trace that ends
// the run before the next agent installs.
test('an unsupported hook event shape fails claude-hooks and the run goes on', () => {
  const dir = freshTmpDir();
  const configDir = path.join(dir, 'claude');
  const env = isolatedEnv(dir);
  const settingsPath = path.join(configDir, 'settings.json');
  const odd = '{"hooks": {"SessionStart": {"foo": 1}}}\n';
  try {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(settingsPath, odd);
    const r = runInstaller(['--only', 'claude', '--only', 'grok', '--with-hooks'], configDir, env);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /claude-hooks — .*unsupported hook event shape for SessionStart/);
    assert.match(r.stdout, /• grok/, 'agents after Claude Code did not install');
    assert.equal(fs.readFileSync(settingsPath, 'utf8'), odd);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Uninstall takes back the directories install made once they are empty, and
// only those: a directory that was there before install stays, even empty.
test('install then uninstall leaves no empty directories behind', () => {
  const dir = freshTmpDir();
  const configDir = path.join(dir, 'claude');
  const home = path.join(dir, 'home');
  const bin = path.join(dir, 'stub-bin');
  try {
    nodeStub(bin, 'opencode', 'process.exit(0);');
    nodeStub(bin, 'npx', 'process.exit(0);');
    const env = { ...stubEnv(isolatedHome(home), bin), CLAUDE_CONFIG_DIR: configDir };
    fs.mkdirSync(path.join(env.OPENCLAW_WORKSPACE, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(env.XDG_CONFIG_HOME, 'opencode', 'themes'), { recursive: true });
    const tree = () => fs.readdirSync(home, { recursive: true }).map(String).sort();
    const before = tree();
    const run = (args) => spawnSync(process.execPath, [INSTALLER, ...args, '--config-dir', configDir, '--non-interactive'], { env, encoding: 'utf8' });
    const installed = run(['--only', 'opencode', '--only', 'cursor', '--only', 'grok', '--only', 'openclaw']);
    assert.equal(installed.status, 0, installed.stdout + installed.stderr);
    assert.ok(fs.existsSync(path.join(env.GROK_HOME, 'skills', 'caveman')), 'setup: grok skills missing');
    const removed = run(['--uninstall']);
    assert.equal(removed.status, 0, removed.stdout + removed.stderr);
    assert.deepEqual(tree(), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
