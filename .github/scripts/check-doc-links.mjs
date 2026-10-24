#!/usr/bin/env node
// Fails on dead documentation links in the given Markdown files. Checked:
// This repo's github.com blob/tree links on main, and relative links: the
// path must exist in this checkout (so a PR adding the target passes).
// Other hosts (badges, videos, registries) are not checked: their outages
// are not ours to gate on.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoPrefix = /^https:\/\/github\.com\/roobie\/agent-caveman\/(?:blob|tree)\/main\/([^#?]+)/;
const failures = [];

for (const file of process.argv.slice(2)) {
  // resolve, not join: on Windows a file on another drive is passed as an absolute path.
  const text = await readFile(resolve(root, file), "utf8");
  const links = new Set([...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]));
  for (const link of links) {
    const repo = link.match(repoPrefix);
    if (repo) {
      if (!existsSync(join(root, decodeURIComponent(repo[1])))) failures.push(`${file}: ${link} (missing in repo)`);
    } else if (!/^[a-z]+:/i.test(link) && !link.startsWith("#")) {
      const path = link.split("#")[0];
      if (path && !existsSync(resolve(root, dirname(file), decodeURIComponent(path)))) failures.push(`${file}: ${link} (missing file)`);
    }
  }
}

if (failures.length) {
  console.error(`dead documentation links:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`documentation links ok (${process.argv.length - 2} files)`);
