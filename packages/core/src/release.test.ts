import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { c } from "tar";

import { assertReleaseAssetUnchanged, assertReleaseNotOlder, downloadRulepacks, findLatestRelease } from "./release.js";
import { applyProject, initializeGithubProject, planProject, validateProject } from "./project.js";
import { testAdapter } from "./test-adapter.js";

test("GitHub Release 资产经 SHA-256 验证后才解包", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-release-test-"));
  try {
    const pack = path.join(root, "rulepacks", "common");
    await mkdir(pack, { recursive: true });
    const manifest = JSON.stringify({ id: "common", version: "0.2.0", status: "ready", kind: "common", entry: "entry.md", dependencies: [], rules: ["entry.md"] });
    await writeFile(path.join(pack, "pack.json"), manifest);
    await writeFile(path.join(pack, "entry.md"), "# 远程规则\n");
    const sourceCommit = "a".repeat(40);
    await writeFile(path.join(root, "agentrulekit-release.json"), JSON.stringify({ schemaVersion: 1, version: "0.2.0", sourceCommit }));
    const archive = path.join(root, "asset.tar.gz");
    await c({ gzip: true, file: archive, cwd: root }, ["agentrulekit-release.json", "rulepacks"]);
    const bytes = await readFile(archive);
    const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const url = "https://github.com/yadan177/AgentRuleKit/releases/download/v0.2.0/agentrulekit-rulepacks.tar.gz";
    const fakeFetch = (async (input: unknown) => {
      if (String(input).includes("api.github.com")) {
        return new Response(JSON.stringify({ tag_name: "v0.2.0", assets: [{ name: "agentrulekit-rulepacks.tar.gz", browser_download_url: url, digest, size: bytes.length }] }), { status: 200 });
      }
      return new Response(new Uint8Array(bytes), { status: 200 });
    }) as typeof fetch;
    const release = await findLatestRelease("yadan177/AgentRuleKit", fakeFetch);
    const downloaded = await downloadRulepacks(release, fakeFetch);
    try {
      assert.equal(downloaded.version, "0.2.0");
      assert.equal(downloaded.sourceCommit, sourceCommit);
      assert.equal(await readFile(path.join(downloaded.sourceRoot, "rulepacks", "common", "pack.json"), "utf8"), manifest);
      const target = path.join(root, "external-project");
      await mkdir(target);
      const config = await initializeGithubProject(target, testAdapter, {
        root: downloaded.sourceRoot, version: downloaded.version, digest: release.digest, commit: downloaded.sourceCommit,
      }, "yadan177/AgentRuleKit");
      assert.deepEqual(config.source, { type: "github", repository: "yadan177/AgentRuleKit" });
      const lock = JSON.parse(await readFile(path.join(target, ".agent-rules.lock.json"), "utf8"));
      assert.equal(lock.sourceType, "github");
      assert.equal(lock.sourceDigest, release.digest);
      assert.equal(lock.sourceCommit, sourceCommit);
      assert.doesNotThrow(() => assertReleaseAssetUnchanged(lock, release));
      assert.throws(() => assertReleaseAssetUnchanged(lock, { ...release, digest: `sha256:${"0".repeat(64)}` }), /可能已被替换/);
      assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
      assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# 远程规则\n");
      delete lock.sourceCommit;
      await writeFile(path.join(target, ".agent-rules.lock.json"), JSON.stringify(lock));
      assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "source-provenance-missing"));
    } finally {
      await downloaded.cleanup();
    }
    await assert.rejects(downloadRulepacks({ ...release, digest: `sha256:${"0".repeat(64)}` }, fakeFetch), /SHA-256/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("网络错误和损坏的 Release 归档会在写入项目之前失败", async () => {
  const unavailable = (async () => new Response("unavailable", { status: 503 })) as typeof fetch;
  await assert.rejects(findLatestRelease("yadan177/AgentRuleKit", unavailable), /HTTP 503/);
  const incomplete = (async () => new Response(JSON.stringify({ tag_name: "v0.2.0", assets: [{ name: "agentrulekit-rulepacks.tar.gz", browser_download_url: "https://github.com/yadan177/AgentRuleKit/releases/download/v0.2.0/agentrulekit-rulepacks.tar.gz", digest: `sha256:${"a".repeat(64)}` }] }), { status: 200 })) as typeof fetch;
  await assert.rejects(findLatestRelease("yadan177/AgentRuleKit", incomplete), /体积超限/);
  const bytes = Buffer.from("not a tar archive");
  const release = {
    version: "0.2.0",
    assetUrl: "https://github.com/yadan177/AgentRuleKit/releases/download/v0.2.0/agentrulekit-rulepacks.tar.gz",
    digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
  await assert.rejects(downloadRulepacks(release, unavailable), /HTTP 503/);
  const corrupt = (async () => new Response(new Uint8Array(bytes), { status: 200 })) as typeof fetch;
  await assert.rejects(downloadRulepacks(release, corrupt));
});

test("stable Release 版本按数值比较并拒绝倒退", async () => {
  assert.doesNotThrow(() => assertReleaseNotOlder({ sourceVersion: "0.9.0" }, { version: "0.10.0" }));
  assert.doesNotThrow(() => assertReleaseNotOlder({ sourceVersion: "0.10.0" }, { version: "0.10.0" }));
  assert.throws(() => assertReleaseNotOlder({ sourceVersion: "0.10.0" }, { version: "0.9.9" }), /拒绝自动降级/);
  assert.throws(() => assertReleaseNotOlder({ sourceVersion: "1.0.0" }, { version: "0.99.99" }), /拒绝自动降级/);
  assert.throws(() => assertReleaseNotOlder({ sourceVersion: "0.1.0-beta" }, { version: "0.1.0" }), /非 stable/);
  const prerelease = (async () => new Response(JSON.stringify({ tag_name: "v0.2.0-beta.1", assets: [] }), { status: 200 })) as typeof fetch;
  await assert.rejects(findLatestRelease("yadan177/AgentRuleKit", prerelease), /不符合 stable/);
});

test("Release 归档缺少来源提交或与版本不符时拒绝安装", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-provenance-test-"));
  try {
    const pack = path.join(root, "rulepacks", "common");
    await mkdir(pack, { recursive: true });
    await writeFile(path.join(pack, "pack.json"), JSON.stringify({ id: "common", version: "0.2.0", status: "ready", kind: "common", entry: "entry.md", dependencies: [], rules: ["entry.md"] }));
    await writeFile(path.join(pack, "entry.md"), "# 规则\n");
    const assetUrl = "https://github.com/yadan177/AgentRuleKit/releases/download/v0.2.0/agentrulekit-rulepacks.tar.gz";
    const attempt = async (entries: string[], expected: RegExp) => {
      const archive = path.join(root, "invalid.tar.gz");
      await c({ gzip: true, file: archive, cwd: root }, entries);
      const bytes = await readFile(archive);
      const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      const fetcher = (async () => new Response(new Uint8Array(bytes), { status: 200 })) as typeof fetch;
      await assert.rejects(downloadRulepacks({ version: "0.2.0", assetUrl, digest }, fetcher), expected);
    };
    await attempt(["rulepacks"], /缺少来源提交记录/);
    await writeFile(path.join(root, "agentrulekit-release.json"), JSON.stringify({ schemaVersion: 1, version: "0.3.0", sourceCommit: "a".repeat(40) }));
    await attempt(["agentrulekit-release.json", "rulepacks"], /版本不匹配/);
    await writeFile(path.join(root, "agentrulekit-release.json"), JSON.stringify({ schemaVersion: 1, version: "0.2.0", sourceCommit: "a".repeat(40) }));
    await attempt(["agentrulekit-release.json", "agentrulekit-release.json", "rulepacks"], /重复条目/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("模拟两个 Release 的远程安装、差异预览与显式更新", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-release-update-"));
  try {
    async function bundle(version: string, sourceCommit: string, rule: string) {
      const directory = path.join(root, `bundle-${version}`);
      const pack = path.join(directory, "rulepacks", "common");
      await mkdir(pack, { recursive: true });
      await writeFile(path.join(pack, "pack.json"), JSON.stringify({ id: "common", version, status: "ready", kind: "common", entry: "entry.md", dependencies: [], rules: ["entry.md"] }));
      await writeFile(path.join(pack, "entry.md"), rule);
      await writeFile(path.join(directory, "agentrulekit-release.json"), JSON.stringify({ schemaVersion: 1, version, sourceCommit }));
      const archive = path.join(directory, "asset.tar.gz");
      await c({ gzip: true, file: archive, cwd: directory }, ["agentrulekit-release.json", "rulepacks"]);
      const bytes = await readFile(archive);
      const release = {
        version,
        assetUrl: `https://github.com/yadan177/AgentRuleKit/releases/download/v${version}/agentrulekit-rulepacks.tar.gz`,
        digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
      };
      const fetcher = (async () => new Response(new Uint8Array(bytes), { status: 200 })) as typeof fetch;
      return { release, fetcher };
    }
    const target = path.join(root, "project");
    await mkdir(target);
    const first = await bundle("0.2.0", "a".repeat(40), "# 旧规则\n");
    const initial = await downloadRulepacks(first.release, first.fetcher);
    let config;
    try {
      config = await initializeGithubProject(target, testAdapter, {
        root: initial.sourceRoot, version: initial.version, digest: first.release.digest, commit: initial.sourceCommit,
      }, "yadan177/AgentRuleKit");
    } finally {
      await initial.cleanup();
    }
    const override = path.join(target, ".agent-rules", "overrides.md");
    await writeFile(override, "# 用户项目规则\n");
    const second = await bundle("0.3.0", "b".repeat(40), "# 新规则\n");
    const updated = await downloadRulepacks(second.release, second.fetcher);
    try {
      const snapshot = { root: updated.sourceRoot, version: updated.version, digest: second.release.digest, commit: updated.sourceCommit };
      const preview = await planProject(target, config, testAdapter, snapshot);
      assert.deepEqual(preview.conflicts, []);
      assert.ok(preview.changes.some((change) => change.path === ".agent-rules/common/entry.md" && change.after === "# 新规则\n"));
      assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# 旧规则\n");
      await applyProject(target, config, testAdapter, undefined, snapshot);
      const lock = JSON.parse(await readFile(path.join(target, ".agent-rules.lock.json"), "utf8"));
      assert.equal(lock.sourceVersion, "0.3.0");
      assert.equal(lock.sourceCommit, "b".repeat(40));
      assert.equal(lock.sourceDigest, second.release.digest);
      assert.equal(await readFile(override, "utf8"), "# 用户项目规则\n");
      assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
      const older = await downloadRulepacks(first.release, first.fetcher);
      try {
        const stale = { root: older.sourceRoot, version: older.version, digest: first.release.digest, commit: older.sourceCommit };
        await assert.rejects(planProject(target, config, testAdapter, stale), /拒绝自动降级/);
        await assert.rejects(applyProject(target, config, testAdapter, undefined, stale), /拒绝自动降级/);
        assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# 新规则\n");
      } finally {
        await older.cleanup();
      }
    } finally {
      await updated.cleanup();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
