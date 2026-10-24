#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

process.stderr.write("\n[windows-compat] Node Windows contracts\n");
const result = spawnSync(process.execPath, [
  "--test",
  "--test-force-exit",
  // Each file launches real child-process fixtures. Bound the outer fan-out so
  // host scheduling does not exhaust the fixtures' deadlines.
  "--test-concurrency=2",
  "tests/installer/portable-process.test.mjs",
  "tests/installer/skills-global-install.test.mjs",
  "tests/installer/provider-skills.test.mjs",
  "tests/installer/provider-skills-integration.test.mjs",
], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

process.stdout.write("windows compatibility gate passed\n");
