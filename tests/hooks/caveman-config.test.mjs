// Unit tests for the per-session mode state primitives in caveman-config.js.
//
// These run in-process (no subprocess), so they are the fast feedback loop for
// the storage layer that caveman-activate.js, caveman-mode-tracker.js and
// the other hooks all sit on top of.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CONFIG = require('../../src/hooks/caveman-config.js');

const {
  SESSIONS_DIRNAME, FLAG_BASENAME, PREV_BASENAME,
  validateSessionId, sessionActivePath, sessionPrevPath,
  resolveActiveMode, readSessionModeRaw, writeSessionMode,
  writeSessionPrev, readSessionPrev, clearSessionPrev,
  gcSessionStore, recordModeChange, MODE_LOG_BASENAME,
} = CONFIG;

function tmpClaudeDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-cfg-'));
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  return path.join(dir, '.claude');
}

function cleanup(claudeDir) {
  fs.rmSync(path.dirname(claudeDir), { recursive: true, force: true });
}

function sessionFile(claudeDir, sid, ext = '.mode') {
  return path.join(claudeDir, SESSIONS_DIRNAME, sid + ext);
}

// ── validateSessionId ───────────────────────────────────────────────────────

test('validateSessionId accepts realistic ids', () => {
  for (const id of [
    '6a93743f-0319-474f-b761-2cbe021aa5b2',
    'abc123',
    'A_b-C_9',
    'x',
    'q'.repeat(128),
  ]) {
    assert.equal(validateSessionId(id), id, `should accept ${id}`);
  }
});

test('validateSessionId rejects traversal and junk', () => {
  for (const id of [
    '../../etc/passwd',
    '..',
    '.',
    'a/b',
    'a\\b',
    'a.b',            // dot would let an id masquerade as another ext
    '',
    ' ',
    'a b',
    'q'.repeat(129),
    'sess\0id',
    'sess\nid',
    'ünïcode',
    null, undefined, 42, {}, [],
  ]) {
    assert.equal(validateSessionId(id), null, `should reject ${JSON.stringify(id)}`);
  }
});

test('session paths return null for rejected ids and never escape the dir', () => {
  const claudeDir = tmpClaudeDir();
  try {
    assert.equal(sessionActivePath(claudeDir, '../../evil'), null);
    assert.equal(sessionPrevPath(claudeDir, 'a/b'), null);
    assert.equal(sessionActivePath(claudeDir, null), null);

    const good = sessionActivePath(claudeDir, 'sess1');
    assert.equal(path.dirname(good), path.join(claudeDir, SESSIONS_DIRNAME));
    assert.equal(path.basename(good), 'sess1.mode');
  } finally { cleanup(claudeDir); }
});

// ── write / read round-trip ─────────────────────────────────────────────────

test('writeSessionMode writes the session file and mirrors to legacy', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionMode(claudeDir, 'sess1', 'ultracave');

    assert.equal(fs.readFileSync(sessionFile(claudeDir, 'sess1'), 'utf8'), 'ultracave');
    assert.equal(fs.readFileSync(path.join(claudeDir, FLAG_BASENAME), 'utf8'), 'ultracave');
    assert.equal(resolveActiveMode(claudeDir, 'sess1'), 'ultracave');
  } finally { cleanup(claudeDir); }
});

test('off is durable in the session file but NEVER literal in the legacy mirror', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionMode(claudeDir, 'sess1', 'caveman');
    writeSessionMode(claudeDir, 'sess1', null);

    // Durable: the value survives on disk, so a later SessionStart can see it.
    assert.equal(fs.readFileSync(sessionFile(claudeDir, 'sess1'), 'utf8'), 'off');
    assert.equal(readSessionModeRaw(claudeDir, 'sess1'), 'off');

    // Compat: an older hook or statusline reading the legacy path must see
    // absence, not the string 'off'.
    assert.equal(fs.existsSync(path.join(claudeDir, FLAG_BASENAME)), false);

    // Both representations collapse to "no mode" for readers.
    assert.equal(resolveActiveMode(claudeDir, 'sess1'), null);
  } finally { cleanup(claudeDir); }
});

test("writeSessionMode('off') is equivalent to writing null", () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionMode(claudeDir, 'sess1', 'off');
    assert.equal(fs.readFileSync(sessionFile(claudeDir, 'sess1'), 'utf8'), 'off');
    assert.equal(resolveActiveMode(claudeDir, 'sess1'), null);
  } finally { cleanup(claudeDir); }
});

test('writeSessionMode ignores values outside VALID_MODES', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionMode(claudeDir, 'sess1', 'sudo-mode');
    assert.equal(fs.existsSync(sessionFile(claudeDir, 'sess1')), false);
    assert.equal(fs.existsSync(path.join(claudeDir, FLAG_BASENAME)), false);
  } finally { cleanup(claudeDir); }
});

test('parallel sessions keep independent modes; legacy mirror is last-write-wins', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionMode(claudeDir, 'sessA', 'ultracave');
    writeSessionMode(claudeDir, 'sessB', 'caveman');

    assert.equal(resolveActiveMode(claudeDir, 'sessA'), 'ultracave');
    assert.equal(resolveActiveMode(claudeDir, 'sessB'), 'caveman');
    assert.equal(fs.readFileSync(path.join(claudeDir, FLAG_BASENAME), 'utf8'), 'caveman');

    // Turning B off must not disturb A.
    writeSessionMode(claudeDir, 'sessB', null);
    assert.equal(resolveActiveMode(claudeDir, 'sessA'), 'ultracave');
    assert.equal(resolveActiveMode(claudeDir, 'sessB'), null);
  } finally { cleanup(claudeDir); }
});

// ── fallback behavior (the whole back-compat story) ─────────────────────────

test('no session id degrades to the legacy machine-wide file', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionMode(claudeDir, null, 'caveman');

    assert.equal(fs.existsSync(path.join(claudeDir, SESSIONS_DIRNAME)), false);
    assert.equal(fs.readFileSync(path.join(claudeDir, FLAG_BASENAME), 'utf8'), 'caveman');
    assert.equal(resolveActiveMode(claudeDir, null), 'caveman');

    writeSessionMode(claudeDir, null, null);
    assert.equal(fs.existsSync(path.join(claudeDir, FLAG_BASENAME)), false);
    assert.equal(resolveActiveMode(claudeDir, null), null);
  } finally { cleanup(claudeDir); }
});

test('a pre-upgrade legacy flag is honored until the session writes its own', () => {
  const claudeDir = tmpClaudeDir();
  try {
    // Simulates a user upgrading: only the old flag exists on disk.
    fs.writeFileSync(path.join(claudeDir, FLAG_BASENAME), 'caveman');
    assert.equal(resolveActiveMode(claudeDir, 'sess1'), 'caveman');

    writeSessionMode(claudeDir, 'sess1', 'ultracave');
    assert.equal(resolveActiveMode(claudeDir, 'sess1'), 'ultracave');
  } finally { cleanup(claudeDir); }
});

test('a legacy flag holding the literal off reads as off, not as a mode', () => {
  const claudeDir = tmpClaudeDir();
  try {
    // Defensive: we never write this shape, but a hand-edit or third-party
    // tool could, and it must not activate caveman.
    fs.writeFileSync(path.join(claudeDir, FLAG_BASENAME), 'off');
    assert.equal(resolveActiveMode(claudeDir, null), null);
    assert.equal(resolveActiveMode(claudeDir, 'sess1'), null);
  } finally { cleanup(claudeDir); }
});

test('readSessionModeRaw does not fall back to legacy for a valid session', () => {
  const claudeDir = tmpClaudeDir();
  try {
    fs.writeFileSync(path.join(claudeDir, FLAG_BASENAME), 'caveman');

    // No session file yet: raw read must report nothing rather than borrowing
    // whatever another session left in the mirror.
    assert.equal(readSessionModeRaw(claudeDir, 'sess1'), null);
    assert.equal(readSessionModeRaw(claudeDir, null), 'caveman');
  } finally { cleanup(claudeDir); }
});

// ── prev (one-shot independent modes, #599) ────────────────────────────────

test('prev is scoped per session', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionPrev(claudeDir, 'sessA', 'ultracave');
    writeSessionPrev(claudeDir, 'sessB', 'caveman');

    assert.equal(readSessionPrev(claudeDir, 'sessA'), 'ultracave');
    assert.equal(readSessionPrev(claudeDir, 'sessB'), 'caveman');

    clearSessionPrev(claudeDir, 'sessA');
    assert.equal(readSessionPrev(claudeDir, 'sessA'), null);
    assert.equal(readSessionPrev(claudeDir, 'sessB'), 'caveman');
  } finally { cleanup(claudeDir); }
});

test('prev falls back to the legacy path without a session id', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionPrev(claudeDir, null, 'caveman');
    assert.equal(fs.readFileSync(path.join(claudeDir, PREV_BASENAME), 'utf8'), 'caveman');
    assert.equal(readSessionPrev(claudeDir, null), 'caveman');
  } finally { cleanup(claudeDir); }
});

test('a session with no prev of its own does NOT borrow the legacy one', () => {
  const claudeDir = tmpClaudeDir();
  try {
    // Stale machine-wide prev from an older, session-less run.
    fs.writeFileSync(path.join(claudeDir, PREV_BASENAME), 'ultracave');

    // A session that never had caveman on saves no prev — there is nothing to
    // displace. Borrowing the stale one would switch that session ON at ultracave.
    assert.equal(readSessionPrev(claudeDir, 'sessNew'), null);
  } finally { cleanup(claudeDir); }
});

test('clearing a session prev does not delete the machine-wide one', () => {
  const claudeDir = tmpClaudeDir();
  try {
    fs.writeFileSync(path.join(claudeDir, PREV_BASENAME), 'ultracave');
    writeSessionPrev(claudeDir, 'sessA', 'caveman');

    clearSessionPrev(claudeDir, 'sessA');
    assert.equal(readSessionPrev(claudeDir, 'sessA'), null);
    assert.equal(
      fs.readFileSync(path.join(claudeDir, PREV_BASENAME), 'utf8'), 'ultracave',
      'a session-scoped clear must not reach across into machine-wide state',
    );
  } finally { cleanup(claudeDir); }
});

// ── mode-transition log ────────────────────────────────────────────────────

function logLines(claudeDir) {
  const p = path.join(claudeDir, MODE_LOG_BASENAME);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
}

test('recordModeChange tags entries with the session id', () => {
  const claudeDir = tmpClaudeDir();
  try {
    recordModeChange(claudeDir, 'ultracave', 'sessA');
    writeSessionMode(claudeDir, 'sessA', 'ultracave');

    const entries = logLines(claudeDir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].mode, 'ultracave');
    assert.equal(entries[0].prev, null);
    assert.equal(entries[0].session_id, 'sessA');
  } finally { cleanup(claudeDir); }
});

test('recordModeChange omits session_id entirely when unknown', () => {
  const claudeDir = tmpClaudeDir();
  try {
    recordModeChange(claudeDir, 'caveman');
    const entry = logLines(claudeDir)[0];
    assert.equal('session_id' in entry, false, 'key must be absent, not null');
  } finally { cleanup(claudeDir); }
});

test('recordModeChange compares against the same session, not the shared mirror', () => {
  const claudeDir = tmpClaudeDir();
  try {
    // Session B is on ultracave, so the legacy mirror holds 'ultracave'.
    writeSessionMode(claudeDir, 'sessB', 'ultracave');
    // Session A moving to ultracave is still a real transition FOR A.
    recordModeChange(claudeDir, 'ultracave', 'sessA');

    const entries = logLines(claudeDir);
    assert.equal(entries.length, 1, 'A -> ultracave must be logged despite the mirror');
    assert.equal(entries[0].session_id, 'sessA');
    assert.equal(entries[0].prev, null);
  } finally { cleanup(claudeDir); }
});

test('durable off does not log a phantom off -> null transition', () => {
  const claudeDir = tmpClaudeDir();
  try {
    recordModeChange(claudeDir, 'caveman', 'sessA');
    writeSessionMode(claudeDir, 'sessA', 'caveman');

    recordModeChange(claudeDir, null, 'sessA');
    writeSessionMode(claudeDir, 'sessA', null);

    // Already off on disk as the literal 'off'; deactivating again is a no-op.
    recordModeChange(claudeDir, null, 'sessA');

    const entries = logLines(claudeDir);
    assert.equal(entries.length, 2, `expected 2 transitions, got ${entries.length}`);
    assert.deepEqual(entries.map(e => e.mode), ['caveman', null]);
    assert.deepEqual(entries.map(e => e.prev), [null, 'caveman']);
  } finally { cleanup(claudeDir); }
});

test("recordModeChange never writes 'off' as a mode value", () => {
  const claudeDir = tmpClaudeDir();
  try {
    recordModeChange(claudeDir, 'off', 'sessA');
    const entries = logLines(claudeDir);
    assert.equal(entries.length, 0, 'off from a clean slate is not a transition');

    writeSessionMode(claudeDir, 'sessA', 'caveman');
    recordModeChange(claudeDir, 'off', 'sessA');
    assert.equal(logLines(claudeDir)[0].mode, null, "'off' must normalize to null");
  } finally { cleanup(claudeDir); }
});

// ── GC ─────────────────────────────────────────────────────────────────────

test('gcSessionStore removes stale files and keeps fresh ones', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionMode(claudeDir, 'oldSess', 'caveman');
    writeSessionMode(claudeDir, 'newSess', 'ultracave');

    const stale = sessionFile(claudeDir, 'oldSess');
    const longAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    fs.utimesSync(stale, longAgo / 1000, longAgo / 1000);

    const deleted = gcSessionStore(claudeDir);
    assert.equal(deleted, 1);
    assert.equal(fs.existsSync(stale), false);
    assert.equal(fs.existsSync(sessionFile(claudeDir, 'newSess')), true);
  } finally { cleanup(claudeDir); }
});

test('gcSessionStore honors maxDeletes and a missing directory', () => {
  const claudeDir = tmpClaudeDir();
  try {
    assert.equal(gcSessionStore(claudeDir), 0, 'no sessions dir yet — must not throw');

    const longAgo = (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000;
    for (const sid of ['s1', 's2', 's3']) {
      writeSessionMode(claudeDir, sid, 'caveman');
      fs.utimesSync(sessionFile(claudeDir, sid), longAgo, longAgo);
    }

    assert.equal(gcSessionStore(claudeDir, { maxDeletes: 2 }), 2);
    assert.equal(gcSessionStore(claudeDir), 1);
  } finally { cleanup(claudeDir); }
});

test('gcSessionStore refuses to follow a symlink out of the sessions dir', () => {
  const claudeDir = tmpClaudeDir();
  try {
    const outside = path.join(path.dirname(claudeDir), 'precious.txt');
    fs.writeFileSync(outside, 'do not delete');

    const dir = path.join(claudeDir, SESSIONS_DIRNAME);
    fs.mkdirSync(dir, { recursive: true });
    const link = path.join(dir, 'evil.mode');
    fs.symlinkSync(outside, link);
    const longAgo = (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000;
    fs.lutimesSync(link, longAgo, longAgo);

    assert.equal(gcSessionStore(claudeDir), 0, 'symlink must be skipped');
    assert.equal(fs.existsSync(outside), true, 'target must survive');
  } finally { cleanup(claudeDir); }
});

test('CAVEMAN_SESSION_TTL_MS overrides the sweep age', () => {
  const claudeDir = tmpClaudeDir();
  const prior = process.env.CAVEMAN_SESSION_TTL_MS;
  try {
    writeSessionMode(claudeDir, 'sess1', 'caveman');
    const old = (Date.now() - 5000) / 1000;
    fs.utimesSync(sessionFile(claudeDir, 'sess1'), old, old);

    process.env.CAVEMAN_SESSION_TTL_MS = '1000';
    assert.equal(gcSessionStore(claudeDir), 1);
  } finally {
    if (prior === undefined) delete process.env.CAVEMAN_SESSION_TTL_MS;
    else process.env.CAVEMAN_SESSION_TTL_MS = prior;
    cleanup(claudeDir);
  }
});

// ── three-skill model: legacy level names ───────────────────────────────────
//
// Session files, mirrors, prev files and config written before the switch hold
// the six old level names. Every read maps them forward; no write emits one.

const LEGACY = {
  lite: 'caveman', full: 'caveman', ultra: 'ultracave', megacave: 'caveman', wenyan: 'caveman',
  'wenyan-lite': 'caveman', 'wenyan-full': 'caveman', 'wenyan-ultra': 'caveman',
};

test('canonicalMode maps legacy levels, passes new ids, rejects the rest', () => {
  const { canonicalMode, VALID_MODES } = CONFIG;
  assert.deepEqual(VALID_MODES, ['off', 'caveman', 'ultracave', 'commit', 'review', 'compress']);
  for (const [old, mode] of Object.entries(LEGACY)) assert.equal(canonicalMode(old), mode, old);
  for (const mode of VALID_MODES) assert.equal(canonicalMode(mode), mode);
  for (const junk of ['manual', 'bogus', '', null, undefined, 42, 'constructor', '__proto__']) {
    assert.equal(canonicalMode(junk), null, String(junk));
  }
});

test('legacy session file, mirror and prev all read back as the new id', () => {
  const claudeDir = tmpClaudeDir();
  try {
    fs.mkdirSync(path.join(claudeDir, SESSIONS_DIRNAME), { recursive: true });
    fs.writeFileSync(sessionFile(claudeDir, 'sessA'), 'wenyan-lite');
    fs.writeFileSync(sessionFile(claudeDir, 'sessA', '.prev'), 'ultra');
    fs.writeFileSync(path.join(claudeDir, FLAG_BASENAME), 'lite');
    assert.equal(resolveActiveMode(claudeDir, 'sessA'), 'caveman');
    assert.equal(readSessionModeRaw(claudeDir, 'sessA'), 'caveman');
    assert.equal(readSessionPrev(claudeDir, 'sessA'), 'ultracave');
    // No session state: the mirror's legacy value.
    assert.equal(resolveActiveMode(claudeDir, 'sessB'), 'caveman');
    assert.equal(resolveActiveMode(claudeDir, null), 'caveman');
  } finally { cleanup(claudeDir); }
});

test('writers accept legacy input but store only new ids', () => {
  const claudeDir = tmpClaudeDir();
  try {
    writeSessionMode(claudeDir, 'sessA', 'wenyan-full');
    assert.equal(fs.readFileSync(sessionFile(claudeDir, 'sessA'), 'utf8'), 'caveman');
    assert.equal(fs.readFileSync(path.join(claudeDir, FLAG_BASENAME), 'utf8'), 'caveman');
    writeSessionPrev(claudeDir, 'sessA', 'full');
    assert.equal(fs.readFileSync(sessionFile(claudeDir, 'sessA', '.prev'), 'utf8'), 'caveman');
    writeSessionMode(claudeDir, 'sessA', 'manual');
    assert.equal(fs.readFileSync(sessionFile(claudeDir, 'sessA'), 'utf8'), 'caveman', 'manual is never stored');
  } finally { cleanup(claudeDir); }
});

test('a legacy-to-new rewrite of the same mode is not a logged transition', () => {
  const claudeDir = tmpClaudeDir();
  try {
    fs.mkdirSync(path.join(claudeDir, SESSIONS_DIRNAME), { recursive: true });
    fs.writeFileSync(sessionFile(claudeDir, 'sessA'), 'ultra');
    recordModeChange(claudeDir, 'ultracave', 'sessA');
    recordModeChange(claudeDir, 'bogus', 'sessA');
    assert.equal(fs.existsSync(path.join(claudeDir, MODE_LOG_BASENAME)), false);
  } finally { cleanup(claudeDir); }
});

test('getDefaultMode maps a legacy CAVEMAN_DEFAULT_MODE and defaults to caveman', () => {
  const prior = process.env.CAVEMAN_DEFAULT_MODE;
  const priorXdg = process.env.XDG_CONFIG_HOME;
  const xdg = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-xdg-'));
  try {
    process.env.XDG_CONFIG_HOME = xdg;
    process.env.CAVEMAN_DEFAULT_MODE = 'ultra';
    assert.equal(CONFIG.getDefaultMode(xdg), 'ultracave');
    process.env.CAVEMAN_DEFAULT_MODE = 'WENYAN-LITE';
    assert.equal(CONFIG.getDefaultMode(xdg), 'caveman');
    delete process.env.CAVEMAN_DEFAULT_MODE;
    assert.equal(CONFIG.getDefaultMode(xdg), 'caveman');
  } finally {
    if (prior === undefined) delete process.env.CAVEMAN_DEFAULT_MODE;
    else process.env.CAVEMAN_DEFAULT_MODE = prior;
    if (priorXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = priorXdg;
    fs.rmSync(xdg, { recursive: true, force: true });
  }
});

test('loadRuleset returns the whole skill body; thesisLine falls back without a file', () => {
  const hooks = path.dirname(require.resolve('../../src/hooks/caveman-config.js'));
  for (const mode of ['caveman', 'ultracave']) {
    const file = fs.readFileSync(path.join(hooks, '..', '..', 'skills', mode, 'SKILL.md'), 'utf8');
    assert.equal(CONFIG.loadRuleset(mode, hooks), file.replace(/^---[\s\S]*?---\s*/, ''));
  }
  assert.equal(CONFIG.loadRuleset('ultra', hooks), CONFIG.loadRuleset('ultracave', hooks), 'legacy id resolves');
  for (const mode of ['commit', 'review', 'compress', 'off', 'manual', '../x']) {
    assert.equal(CONFIG.loadRuleset(mode, hooks), null, mode);
  }
  const prior = process.env.CLAUDE_PLUGIN_ROOT;
  delete process.env.CLAUDE_PLUGIN_ROOT;
  try {
    const nowhere = path.join(os.tmpdir(), 'caveman-nowhere', 'a', 'b');
    assert.equal(CONFIG.thesisLine('caveman', nowhere),
      'Respond terse like smart caveman. All technical substance stay. Only fluff die.');
    assert.equal(CONFIG.thesisLine('ultracave', nowhere),
      'Respond terse like smart caveman. All technical substance stay. Only fluff die. Then cut again.');
    assert.equal(CONFIG.thesisLine('commit', nowhere), null);
  } finally {
    if (prior !== undefined) process.env.CLAUDE_PLUGIN_ROOT = prior;
  }
  assert.equal(CONFIG.rulesetBanner('wenyan'), 'CAVEMAN MODE ACTIVE — mode: caveman');
});
