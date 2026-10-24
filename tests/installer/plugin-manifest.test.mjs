import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const PLUGIN_MANIFEST = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');

function hookCommands(manifest, eventName) {
  return (manifest.hooks?.[eventName] || [])
    .flatMap(entry => (Array.isArray(entry?.hooks) ? entry.hooks : []))
    .map(hook => hook?.command || '')
    .filter(Boolean);
}

test('plugin manifest wires no SessionEnd hook', () => {
  const manifest = JSON.parse(fs.readFileSync(PLUGIN_MANIFEST, 'utf8'));
  assert.deepEqual(hookCommands(manifest, 'SessionEnd'), []);
});
