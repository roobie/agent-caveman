#!/usr/bin/env node
// Release bump. Every shipped manifest and every bootstrap pin carries the
// version, and a missed one ships an installer that fetches the wrong tag
// (v2.3.0 went out with install.sh still on v2.2.0). This is the one place
// that knows the list.
//
//   node scripts/release.mjs <patch|minor|major|x.y.z> [flags]
//
// Flags (each implies the one before it):
//   --commit   commit the version files only, nothing else staged
//   --tag      annotated tag v<version> on that commit
//   --push     push main and the tag; GH_REPO_TOKEN_AGENT_CAVEMAN is used when set
// Other flags:
//   --dry-run          print the plan, change nothing
//   --no-test          skip the pin-consistency test
//   --work <U-id>      add a `Work:` trailer
//   --trailer <line>   add any other trailer, repeatable
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'roobie/agent-caveman';
const TOKEN_ENV = 'GH_REPO_TOKEN_AGENT_CAVEMAN';

// Carry the release as a `"version"` field.
const JSON_FILES = [
  'package.json',
  'gemini-extension.json',
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  'plugins/caveman/.codex-plugin/plugin.json',
];
// Carry the release as a `v<version>` pin.
const TAG_FILES = ['install.sh', 'install.ps1', 'installer/install.js', 'INSTALL.md'];

const die = (msg) => { console.error(`release: ${msg}`); process.exit(1); };

function parseArgs(argv) {
  const o = { bump: null, level: 0, dryRun: false, test: true, work: null, trailers: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--commit') o.level = Math.max(o.level, 1);
    else if (a === '--tag') o.level = Math.max(o.level, 2);
    else if (a === '--push') o.level = 3;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--no-test') o.test = false;
    else if (a === '--work') o.work = argv[++i] ?? die('--work needs a unit id');
    else if (a === '--trailer') o.trailers.push(argv[++i] ?? die('--trailer needs a line'));
    else if (a.startsWith('-')) die(`unknown flag ${a}`);
    else if (o.bump === null) o.bump = a;
    else die(`unexpected argument ${a}`);
  }
  if (o.bump === null) die('usage: node scripts/release.mjs <patch|minor|major|x.y.z> [--commit|--tag|--push]');
  return o;
}

function nextVersion(cur, arg) {
  if (/^\d+\.\d+\.\d+$/.test(arg)) return arg;
  const m = cur.match(/^(\d+)\.(\d+)\.(\d+)$/) ?? die(`current version ${cur} is not x.y.z`);
  const [a, b, c] = m.slice(1).map(Number);
  if (arg === 'major') return `${a + 1}.0.0`;
  if (arg === 'minor') return `${a}.${b + 1}.0`;
  if (arg === 'patch') return `${a}.${b}.${c + 1}`;
  return die(`bump must be patch, minor, major or x.y.z, got ${arg}`);
}

const read = (rel) => readFileSync(join(root, rel), 'utf8');
const git = (args, input) => spawnSync('git', args, { cwd: root, encoding: 'utf8', input });
function run(cmd, args, input) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'], input });
  if (r.status !== 0) die(`${cmd} ${args[0]} failed`);
}

const opts = parseArgs(process.argv.slice(2));
const cur = JSON.parse(read('package.json')).version;
const next = nextVersion(cur, opts.bump);
const tag = `v${next}`;
console.log(`release: ${cur} -> ${next}${opts.dryRun ? ' (dry run)' : ''}`);

const VERSION_RE = /("version":\s*")[^"]+(")/;
const edits = new Map();
for (const rel of JSON_FILES) {
  const text = read(rel);
  if (!VERSION_RE.test(text)) die(`${rel} has no "version" field`);
  edits.set(rel, text.replace(VERSION_RE, `$1${next}$2`));
}
for (const rel of TAG_FILES) {
  const text = read(rel);
  if (!text.includes(`v${cur}`) && !text.includes(tag)) die(`${rel} pins neither v${cur} nor ${tag}`);
  edits.set(rel, text.split(`v${cur}`).join(tag));
}

for (const [rel, text] of edits) {
  if (text === read(rel)) continue;
  console.log(`  ${opts.dryRun ? 'would update' : 'updated'} ${rel}`);
  if (!opts.dryRun) writeFileSync(join(root, rel), text);
}
if (opts.dryRun) process.exit(0);

// A pin the edits missed fails here, before anything is committed.
for (const rel of TAG_FILES) {
  if (cur !== next && read(rel).includes(`v${cur}`)) die(`${rel} still mentions v${cur}`);
}
if (opts.test) run(process.execPath, ['--test', 'tests/installer/shim-security.test.mjs']);

if (opts.level < 1) process.exit(0);

const files = [...edits.keys()];
const staged = git(['diff', '--cached', '--name-only']).stdout.split('\n').filter(Boolean);
const stray = staged.filter((f) => !files.includes(f));
if (stray.length) die(`refusing to commit with other files staged: ${stray.join(', ')}`);
if (opts.level >= 2 && git(['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).status === 0) die(`tag ${tag} already exists`);

const trailers = [...(opts.work ? [`Work: ${opts.work}`] : []), ...opts.trailers];
run('git', ['add', '--', ...files]);
const message = `chore(release): ${tag}\n${trailers.length ? `\n${trailers.join('\n')}\n` : ''}`;
// Nothing to commit when the files already held this version.
if (git(['diff', '--cached', '--quiet']).status !== 0) run('git', ['commit', '-F', '-'], message);
else console.log('release: version files already committed');

if (opts.level < 2) process.exit(0);
run('git', ['tag', '-a', tag, '-m', tag]);

if (opts.level < 3) process.exit(0);
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
if (branch !== 'main') die(`refusing to push from ${branch}, release from main`);
const token = process.env[TOKEN_ENV];
const remote = token ? `https://x-access-token:${token}@github.com/${REPO}.git` : 'origin';
run('git', ['push', remote, 'main']);
run('git', ['push', remote, tag]);
console.log(`release: pushed main and ${tag}`);
