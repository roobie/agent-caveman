// compile.mjs — derives the always-on activation rule from skills/caveman/SKILL.md
// so the IDE rule, the opencode AGENTS.md body and the caveman-init.js fallback
// cannot drift. Run: node skills/compile.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { activationRule, embedRuleBody } from "./activation-rule.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const initPath = join(repoRoot, "src", "tools", "caveman-init.js");

let rule, init;
try {
  rule = activationRule(readFileSync(join(here, "caveman", "SKILL.md"), "utf8"));
  init = embedRuleBody(readFileSync(initPath, "utf8"), rule);
} catch (error) {
  console.error(`activation rule compile failed: ${error.message}`);
  process.exit(1);
}
writeFileSync(join(repoRoot, "src", "rules", "caveman-activate.md"), rule);
writeFileSync(initPath, init);
console.error("compiled the always-on activation rule into src/rules/caveman-activate.md and src/tools/caveman-init.js");
