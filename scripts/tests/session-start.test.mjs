import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hook = fileURLToPath(new URL("../../plugins/agent-rule-kit/hooks/session_start.mjs", import.meta.url));
const fakeFetch = fileURLToPath(new URL("./fixtures/mock-release-fetch.mjs", import.meta.url));
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function runHook(root, dataDir, mock) {
  const child = spawn(process.execPath, mock ? ["--import", fakeFetch, hook] : [hook], {
    env: {
      ...process.env,
      PLUGIN_DATA: dataDir,
      ...(mock ? { AGENTRULEKIT_TEST_RELEASE: JSON.stringify(mock.release), AGENTRULEKIT_TEST_REQUEST_LOG: mock.requestLog } : {}),
    },
  });
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

test("首次检查联网、当天复用缓存，锁文件变化后重新检查", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-hook-network-"));
  try {
    const project = path.join(root, "project");
    const dataDir = path.join(root, "plugin-data");
    const requestLog = path.join(root, "requests.log");
    await mkdir(project);
    const config = "schemaVersion: 1\n";
    const lockPath = path.join(project, ".agent-rules.lock.json");
    const firstLock = JSON.stringify({ sourceType: "github", source: "yadan177/AgentRuleKit", sourceVersion: "0.1.0", sourceDigest: `sha256:${"a".repeat(64)}` });
    await writeFile(path.join(project, "agent-rules.yaml"), config);
    await writeFile(lockPath, firstLock);
    const release = (version, character) => ({
      tag_name: `v${version}`,
      assets: [{ name: "agentrulekit-rulepacks.tar.gz", digest: `sha256:${character.repeat(64)}` }],
    });

    const first = JSON.parse(await runHook(project, dataDir, { release: release("0.2.0", "b"), requestLog }));
    assert.match(first.hookSpecificOutput.additionalContext, /0\.1\.0 → 0\.2\.0/);
    const cache = JSON.parse(await readFile(path.join(dataDir, `update-check-${hash(project)}.json`), "utf8"));
    assert.equal(cache.version, "0.2.0");
    assert.equal(cache.lockDigest, hash(firstLock));
    assert.ok(Date.now() - cache.checkedAt < 86_400_000);

    const second = JSON.parse(await runHook(project, dataDir, { release: release("0.3.0", "c"), requestLog }));
    assert.match(second.hookSpecificOutput.additionalContext, /0\.1\.0 → 0\.2\.0/);
    assert.equal((await readFile(requestLog, "utf8")).trim().split("\n").length, 1, "同一天不能重复请求 GitHub");

    const secondLock = JSON.stringify({ sourceType: "github", source: "yadan177/AgentRuleKit", sourceVersion: "0.2.0", sourceDigest: `sha256:${"b".repeat(64)}` });
    await writeFile(lockPath, secondLock);
    const third = JSON.parse(await runHook(project, dataDir, { release: release("0.3.0", "c"), requestLog }));
    assert.match(third.hookSpecificOutput.additionalContext, /0\.2\.0 → 0\.3\.0/);
    assert.equal((await readFile(requestLog, "utf8")).trim().split("\n").length, 2, "锁文件变化后应重新检查");
    assert.deepEqual((await readdir(project)).sort(), [".agent-rules.lock.json", "agent-rules.yaml"]);
    assert.equal(await readFile(lockPath, "utf8"), secondLock, "Hook 不得修改项目锁文件");
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

test("远端 Release 低于项目锁定版本时只发安全警告", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-hook-"));
  try {
    const dataDir = path.join(root, "plugin-data");
    await mkdir(dataDir);
    await writeFile(path.join(root, "agent-rules.yaml"), "schemaVersion: 1\n");
    const lock = JSON.stringify({ sourceType: "github", source: "yadan177/AgentRuleKit", sourceVersion: "0.3.0", sourceDigest: `sha256:${"a".repeat(64)}` });
    await writeFile(path.join(root, ".agent-rules.lock.json"), lock);
    await writeFile(path.join(dataDir, `update-check-${hash(root)}.json`), JSON.stringify({
      lockDigest: hash(lock), checkedAt: Date.now(), version: "0.2.0", digest: `sha256:${"b".repeat(64)}`,
    }));
    const output = JSON.parse(await runHook(root, dataDir));
    assert.match(output.hookSpecificOutput.additionalContext, /安全警告/);
    assert.match(output.hookSpecificOutput.additionalContext, /低于项目锁定版本/);
    assert.doesNotMatch(output.hookSpecificOutput.additionalContext, /有新版本/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
