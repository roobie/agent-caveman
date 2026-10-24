import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readPackage(...parts) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, ...parts, 'package.json'), 'utf8'));
}

function packageBins(pkg) {
  if (typeof pkg.bin === 'string') {
    return { [pkg.name.replace(/^@[^/]+\//, '')]: pkg.bin };
  }
  return pkg.bin ?? {};
}

test('the GitHub package exposes only the unified installer', () => {
  const installerBins = Object.entries(packageBins(readPackage()));

  assert.deepEqual(
    installerBins.map(([, target]) => target),
    ['./installer/install.js'],
  );
});
