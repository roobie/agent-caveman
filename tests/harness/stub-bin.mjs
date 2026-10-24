import { chmodSync, copyFileSync, linkSync, mkdirSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";

// Fake binaries have to be launchable the same way the real ones are, and
// Windows offers none of the POSIX shortcuts: there is no shebang, and Node
// refuses to spawn a .cmd/.bat without a shell (CVE-2024-27980).
//
//   nodeStub    a command resolved on PATH. On Windows a .cmd Node shim, the
//               same shape npm/pnpm park on PATH.
//   nativeStub  a binary the installer execFile's directly. On Windows that
//               must be a REAL executable, so the stub is node.exe hardlinked
//               under the binary's name; the preload installed by stubEnv()
//               answers and exits before Node resolves argv[1] as a script.
//
// Both shapes hand the stub body its arguments as `ARGV`. nodeStub bodies are
// ESM, nativeStub bodies are CJS: a Node preload cannot be an ES module.
const isWindows = process.platform === "win32";

const DISPATCH = `// Preloaded into every node process that inherits this env. It only acts when
// the running executable is one of the stubs.
const { basename, join } = require("node:path");
const { existsSync } = require("node:fs");
const stub = join(__dirname, basename(process.execPath, ".exe") + ".stub.cjs");
if (existsSync(stub)) {
  // Node resolved argv[1] against cwd on its way to treating it as a script;
  // basename gives the stub back the word the product actually passed.
  globalThis.__stubArgv = [basename(process.argv[1] ?? ""), ...process.argv.slice(2)];
  require(stub);
  process.exit(0);
}
`;

export function nodeStub(dir, name, source) {
  mkdirSync(dir, { recursive: true });
  const target = join(dir, `${name}.stub.mjs`);
  writeFileSync(target, `const ARGV = process.argv.slice(2);\n${source}`);
  if (!isWindows) {
    const path = join(dir, name);
    writeFileSync(path, `#!/bin/sh\nexec "${process.execPath}" "${target}" "$@"\n`, { mode: 0o755 });
    chmodSync(path, 0o755);
    return path;
  }
  const path = join(dir, `${name}.cmd`);
  writeFileSync(path, ["@echo off", `node "%~dp0\\${name}.stub.mjs" %*`, "exit /b %errorlevel%", ""].join("\r\n"));
  return path;
}

export function nativeStub(dir, name, source) {
  mkdirSync(dir, { recursive: true });
  if (!isWindows) {
    const path = join(dir, name);
    writeFileSync(path, `#!/usr/bin/env node\nconst ARGV = process.argv.slice(2);\n${source}`, { mode: 0o755 });
    chmodSync(path, 0o755);
    return path;
  }
  writeFileSync(join(dir, `${name}.stub.cjs`), `const ARGV = globalThis.__stubArgv;\n${source}`);
  const path = join(dir, `${name}.exe`);
  // Hardlink, so no 100MB copy per fixture; falls back across volumes.
  try { linkSync(process.execPath, path); } catch { copyFileSync(process.execPath, path); }
  return path;
}

// Puts `dir` on PATH (respecting the existing key's casing) and arms the
// nativeStub preload.
export function stubEnv(base, dir) {
  mkdirSync(dir, { recursive: true });
  const env = { ...base };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  env[pathKey] = `${dir}${delimiter}${env[pathKey] ?? ""}`;
  if (!isWindows) return env;
  const dispatch = join(dir, "stub-dispatch.cjs");
  writeFileSync(dispatch, DISPATCH);
  // Inside a quoted NODE_OPTIONS value a backslash is an escape character, so
  // separators are doubled rather than the quotes dropped.
  const quoted = `"${dispatch.replace(/\\/g, "\\\\")}"`;
  env.NODE_OPTIONS = `${env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ` : ""}--require ${quoted}`;
  return env;
}
