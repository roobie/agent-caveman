import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isolatedCliEnv, runCli, runCliWithApi } from "./_cli.mjs";

test("Codex cloud MCP uninstall removes complete block and preserves unrelated config", async () => {
  const isolated = isolatedCliEnv();
  try {
    const configPath = join(isolated.home, ".codex", "config.toml");
    const unrelated = [
      'model = "gpt-test"',
      "",
      "[mcp_servers.keep]",
      'command = "keep"',
      'args = ["one", "two"]',
      "",
    ].join("\n");
    mkdirSync(join(isolated.home, ".codex"), { recursive: true });
    writeFileSync(configPath, unrelated);
    const installed = await runCli(["mcp", "install", "codex", "--server", "caveman-cloud"], { env: isolated.env });
    assert.equal(installed.code, 0, installed.stderr);
    assert.match(readFileSync(configPath, "utf8"), /cloud", "mcp-serve"/);

    const out = await runCli(["mcp", "uninstall", "codex", "--server", "caveman-cloud"], { env: isolated.env });
    assert.equal(out.code, 0, out.stderr);
    const cleaned = readFileSync(configPath, "utf8");
    assert.equal(cleaned, unrelated);
    assert.doesNotMatch(cleaned, /cloud", "mcp-serve"|mcp_servers\.caveman-cloud/);
  } finally {
    isolated.cleanup();
  }
});

test("trace search sends closed structured filters and selected project", async () => {
  const out = await runCliWithApi([
    "cloud",
    "traces",
    "search",
    "--workflow",
    "support-reply",
    "--has-error",
    "true",
    "--min-cost-usd",
    "0.25",
    "--limit",
    "25",
    "--sort",
    "total_cost_usd",
    "--dir",
    "desc",
  ], {
    respond: () => ({ body: { data: [] } }),
  });
  assert.equal(out.code, 0, out.stderr);
  assert.equal(out.requests.length, 1);
  assert.equal(out.requests[0].path, "/api/v1/traces/search?project_id=proj-alias");
  assert.deepEqual(JSON.parse(out.requests[0].body), {
    filters: {
      workflow: ["support-reply"],
      has_error: true,
      min_cost_usd: 0.25,
    },
    sort: { by: "total_cost_usd", dir: "desc" },
    page_size: 25,
  });
});

test("trace show scopes detail and spans to selected project", async () => {
  const out = await runCliWithApi(["cloud", "traces", "show", "0123456789abcdef", "--spans"], {
    respond: () => ({ body: {} }),
  });
  assert.equal(out.code, 0, out.stderr);
  assert.deepEqual(
    out.requests.map((request) => request.path).sort(),
    [
      "/api/v1/traces/0123456789abcdef/spans?project_id=proj-alias",
      "/api/v1/traces/0123456789abcdef?project_id=proj-alias",
    ].sort(),
  );
});

test("experiment CLI rejects lifecycle mutation verbs without HTTP", async () => {
  const out = await runCliWithApi([
    "cloud",
    "experiments",
    "approve",
    "exp-1",
    "--confirm",
    "approve:exp-1",
  ]);
  assert.equal(out.code, 2);
  assert.equal(out.requests.length, 0);
  assert.match(out.stderr, /experiments list\|show <id>\|results <id>/);
});

// #1134: `setup --agent-native <agent> --remove` is the undo for the bundle that
// `setup --agent-native <agent>` installs — and for nothing else. A user who
// reached the same config.toml through `caveman codex` or `caveman enable codex`
// has no bundle journal, so this path warns and stops. The warning was a dead end:
// it named a journal the user has never heard of and no command to run instead,
// which is how "it is also very difficult to uninstall" gets reported as a bug.
// It must name the verb that actually undoes the install they did.
for (const agent of ["codex", "claude"]) {
  test(`setup --agent-native ${agent} --remove points at disable when there is no bundle`, async () => {
    const isolated = isolatedCliEnv();
    try {
      const out = await runCli(["setup", "--agent-native", agent, "--remove"], { env: isolated.env });
      assert.equal(out.code, 0, out.stderr);
      assert.match(out.stderr, /no agent-native bundle journal found/, "the accurate part stays");
      assert.match(
        out.stderr,
        new RegExp(`caveman disable ${agent}`),
        "it must name the command that removes an enable/wrap install",
      );
    } finally {
      isolated.cleanup();
    }
  });
}
