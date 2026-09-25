import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { c } from "tar";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const cli = path.join(repository, "packages", "cli", "dist", "index.js");
const mockFetch = new URL("./fixtures/mock-cli-release-fetch.mjs", import.meta.url).href;
const assetName = "agentrulekit-rulepacks.tar.gz";

function command(statePath, ...args) {
  return spawnSync(process.execPath, ["--import", mockFetch, cli, ...args], {
    encoding: "utf8",
    env: { ...process.env, AGENTRULEKIT_TEST_RELEASE_STATE: statePath },
  });
}

function expectExit(result, code, context) {
  assert.equal(result.status, code, `${context}\n${result.stdout}\n${result.stderr}`);
}

async function bundle(root, version, sourceCommit, rule) {
  const directory = path.join(root, `bundle-${version}`);
  const pack = path.join(directory, "rulepacks", "common");
  await mkdir(pack, { recursive: true });
  await writeFile(path.join(pack, "pack.json"), JSON.stringify({
    id: "common", version, status: "ready", kind: "common",
    entry: "entry.md", dependencies: [], rules: ["entry.md"],
  }));
  await writeFile(path.join(pack, "entry.md"), rule);
  await writeFile(path.join(directory, "agentrulekit-release.json"), JSON.stringify({
    schemaVersion: 1, version, sourceCommit,
  }));
  const assetPath = path.join(directory, assetName);
  await c({ gzip: true, file: assetPath, cwd: directory }, ["agentrulekit-release.json", "rulepacks"]);
  const bytes = await readFile(assetPath);
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  const assetUrl = `https://github.com/yadan177/AgentRuleKit/releases/download/v${version}/${assetName}`;
  return {
    assetPath,
    release: {
      tag_name: `v${version}`,
      assets: [{ name: assetName, browser_download_url: assetUrl, digest, size: bytes.length }],
    },
  };
}

test("CLI 模拟 GitHub Release 完成远程安装、检查、预览与显式更新", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-remote-cli-"));
  try {
    const project = path.join(root, "project");
    const statePath = path.join(root, "release-state.json");
    const installedRule = path.join(project, ".agent-rules", "common", "entry.md");
    const override = path.join(project, ".agent-rules", "overrides.md");
    await mkdir(project);
    await writeFile(path.join(project, "AGENTS.md"), "# 原有项目说明\n");
    await writeFile(path.join(project, "keep.md"), "业务文件\n");

    const first = await bundle(root, "0.1.0", "a".repeat(40), "# 旧规则\n");
    await writeFile(statePath, JSON.stringify(first));
    const initial = command(statePath, "init", project);
    expectExit(initial, 0, "远程初始化");
    assert.match(initial.stdout, /建议规则包：common/);
    assert.equal(await readFile(installedRule, "utf8"), "# 旧规则\n");
    assert.match(await readFile(path.join(project, "AGENTS.md"), "utf8"), /# 原有项目说明/);
    const firstLock = JSON.parse(await readFile(path.join(project, ".agent-rules.lock.json"), "utf8"));
    assert.equal(firstLock.sourceType, "github");
    assert.equal(firstLock.sourceVersion, "0.1.0");
    assert.equal(firstLock.sourceDigest, first.release.assets[0].digest);
    assert.equal(firstLock.sourceCommit, "a".repeat(40));
    expectExit(command(statePath, "validate", project), 0, "初始化后校验");
    expectExit(command(statePath, "check", project), 0, "首次远程版本检查");

    await writeFile(override, "# 项目专属规则\n请保留\n");
    const second = await bundle(root, "0.2.0", "b".repeat(40), "# 新规则\n");
    await writeFile(statePath, JSON.stringify(second));
    const updateFound = command(statePath, "check", project);
    expectExit(updateFound, 3, "发现远程新版本");
    assert.match(updateFound.stdout, /0\.1\.0 → 0\.2\.0/);
    const preview = command(statePath, "diff", project);
    expectExit(preview, 0, "远程差异预览");
    assert.match(preview.stdout, /\+# 新规则/);
    assert.equal(await readFile(installedRule, "utf8"), "# 旧规则\n");

    const rejectedState = structuredClone(second);
    rejectedState.release.assets[0].digest = `sha256:${"0".repeat(64)}`;
    await writeFile(statePath, JSON.stringify(rejectedState));
    const rejected = command(statePath, "update", project, "--apply");
    expectExit(rejected, 1, "摘要不匹配时拒绝更新");
    assert.match(rejected.stderr, /SHA-256 校验失败/);
    assert.equal(await readFile(installedRule, "utf8"), "# 旧规则\n");
    assert.equal(await readFile(override, "utf8"), "# 项目专属规则\n请保留\n");

    await writeFile(statePath, JSON.stringify(second));
    const updated = command(statePath, "update", project, "--apply");
    expectExit(updated, 0, "显式应用远程更新");
    assert.match(updated.stdout, /已在 .* 应用/);
    assert.equal(await readFile(installedRule, "utf8"), "# 新规则\n");
    assert.equal(await readFile(override, "utf8"), "# 项目专属规则\n请保留\n");
    assert.equal(await readFile(path.join(project, "keep.md"), "utf8"), "业务文件\n");
    const finalLock = JSON.parse(await readFile(path.join(project, ".agent-rules.lock.json"), "utf8"));
    assert.equal(finalLock.sourceVersion, "0.2.0");
    assert.equal(finalLock.sourceDigest, second.release.assets[0].digest);
    assert.equal(finalLock.sourceCommit, "b".repeat(40));
    expectExit(command(statePath, "validate", project), 0, "远程更新后校验");
    expectExit(command(statePath, "check", project), 0, "远程更新后版本检查");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
