import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hook = fileURLToPath(new URL("../../plugins/agent-rule-kit/hooks/session_start.mjs", import.meta.url));
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function runHook(root, dataDir) {
  const child = spawn(process.execPath, [hook], { env: { ...process.env, PLUGIN_DATA: dataDir } });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
  child.stdin.end(JSON.stringify({ cwd: root }));
  const [code] = await once(child, "close");
  assert.equal(code, 0, stderr);
  return stdout;
}

test("本地工作区路径即使像 owner/repo 也不会触发远程检查", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-hook-"));
  try {
    await writeFile(path.join(root, "agent-rules.yaml"), "schemaVersion: 1\n");
    await writeFile(path.join(root, ".agent-rules.lock.json"), JSON.stringify({ sourceType: "workspace", source: "owner/repo" }));
    assert.equal(await runHook(root, path.join(root, "plugin-data")), "");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("缓存的新版本只提醒，不自动应用", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-hook-"));
  try {
    const dataDir = path.join(root, "plugin-data");
    await mkdir(dataDir);
    await writeFile(path.join(root, "agent-rules.yaml"), "schemaVersion: 1\n");
    const lock = JSON.stringify({ sourceType: "github", source: "yadan177/AgentRuleKit", sourceVersion: "0.1.0" });
    await writeFile(path.join(root, ".agent-rules.lock.json"), lock);
    await writeFile(path.join(dataDir, `update-check-${hash(root)}.json`), JSON.stringify({
      lockDigest: hash(lock), checkedAt: Date.now(), version: "0.2.0",
    }));
    const output = JSON.parse(await runHook(root, dataDir));
    assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(output.hookSpecificOutput.additionalContext, /0\.1\.0 → 0\.2\.0/);
    assert.match(output.hookSpecificOutput.additionalContext, /不要运行 update --apply/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("同版本 Release 资产摘要变化时发出安全警告", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-hook-"));
  try {
    const dataDir = path.join(root, "plugin-data");
    await mkdir(dataDir);
    await writeFile(path.join(root, "agent-rules.yaml"), "schemaVersion: 1\n");
    const lock = JSON.stringify({ sourceType: "github", source: "yadan177/AgentRuleKit", sourceVersion: "0.1.0", sourceDigest: `sha256:${"a".repeat(64)}` });
    await writeFile(path.join(root, ".agent-rules.lock.json"), lock);
    await writeFile(path.join(dataDir, `update-check-${hash(root)}.json`), JSON.stringify({
      lockDigest: hash(lock), checkedAt: Date.now(), version: "0.1.0", digest: `sha256:${"b".repeat(64)}`,
    }));
    const output = JSON.parse(await runHook(root, dataDir));
    assert.match(output.hookSpecificOutput.additionalContext, /安全警告/);
    assert.match(output.hookSpecificOutput.additionalContext, /不要应用更新/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
