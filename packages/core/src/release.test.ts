import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { c } from "tar";

import { assertReleaseAssetUnchanged, downloadRulepacks, findLatestRelease } from "./release.js";
import { initializeGithubProject, validateProject } from "./project.js";
import { testAdapter } from "./test-adapter.js";

test("GitHub Release 资产经 SHA-256 验证后才解包", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-release-test-"));
  try {
    const pack = path.join(root, "rulepacks", "common");
    await mkdir(pack, { recursive: true });
    const manifest = JSON.stringify({ id: "common", version: "0.2.0", status: "ready", kind: "common", entry: "entry.md", dependencies: [], rules: ["entry.md"] });
    await writeFile(path.join(pack, "pack.json"), manifest);
    await writeFile(path.join(pack, "entry.md"), "# 远程规则\n");
    const archive = path.join(root, "asset.tar.gz");
    await c({ gzip: true, file: archive, cwd: root }, ["rulepacks"]);
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
      assert.equal(await readFile(path.join(downloaded.sourceRoot, "rulepacks", "common", "pack.json"), "utf8"), manifest);
      const target = path.join(root, "external-project");
      await mkdir(target);
      const config = await initializeGithubProject(target, testAdapter, downloaded.sourceRoot, "yadan177/AgentRuleKit", downloaded.version, release.digest);
      assert.deepEqual(config.source, { type: "github", repository: "yadan177/AgentRuleKit" });
      const lock = JSON.parse(await readFile(path.join(target, ".agent-rules.lock.json"), "utf8"));
      assert.equal(lock.sourceType, "github");
      assert.equal(lock.sourceDigest, release.digest);
      assert.doesNotThrow(() => assertReleaseAssetUnchanged(lock, release));
      assert.throws(() => assertReleaseAssetUnchanged(lock, { ...release, digest: `sha256:${"0".repeat(64)}` }), /可能已被替换/);
      assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
      assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# 远程规则\n");
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
