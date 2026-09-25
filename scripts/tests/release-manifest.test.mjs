import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { c } from "tar";

import { downloadRulepacks } from "../../packages/core/dist/release.js";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const script = path.join(repository, "scripts", "create-release-manifest.mjs");
const packageVersion = JSON.parse(await readFile(path.join(repository, "package.json"), "utf8")).version;

test("Release 来源记录固定仓库版本和完整提交号", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-release-manifest-"));
  try {
    const destination = path.join(root, "agentrulekit-release.json");
    const sourceCommit = "a".repeat(40);
    const valid = spawnSync(process.execPath, [script, `v${packageVersion}`, sourceCommit, destination], { cwd: repository, encoding: "utf8" });
    assert.equal(valid.status, 0, valid.stderr);
    assert.deepEqual(JSON.parse(await readFile(destination, "utf8")), { schemaVersion: 1, version: packageVersion, sourceCommit });
    const invalid = spawnSync(process.execPath, [script, "v999.0.0", sourceCommit, destination], { cwd: repository, encoding: "utf8" });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /与 v999\.0\.0 不一致/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("完整规则源按 Release 布局打包后可校验和读取", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-release-bundle-"));
  try {
    await cp(path.join(repository, "rulepacks"), path.join(root, "rulepacks"), { recursive: true });
    await cp(path.join(repository, "LICENSE"), path.join(root, "LICENSE"));
    const sourceCommit = "b".repeat(40);
    await writeFile(path.join(root, "agentrulekit-release.json"), JSON.stringify({ schemaVersion: 1, version: packageVersion, sourceCommit }));
    const archive = path.join(root, "agentrulekit-rulepacks.tar.gz");
    await c({ gzip: true, file: archive, cwd: root }, ["agentrulekit-release.json", "LICENSE", "rulepacks"]);
    const bytes = await readFile(archive);
    const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const assetUrl = `https://github.com/yadan177/AgentRuleKit/releases/download/v${packageVersion}/agentrulekit-rulepacks.tar.gz`;
    const fetcher = async () => new Response(new Uint8Array(bytes), { status: 200 });
    const downloaded = await downloadRulepacks({ version: packageVersion, assetUrl, digest }, fetcher);
    try {
      assert.equal(downloaded.sourceCommit, sourceCommit);
      assert.equal(await readFile(path.join(downloaded.sourceRoot, "LICENSE"), "utf8"), await readFile(path.join(repository, "LICENSE"), "utf8"));
      assert.match(await readFile(path.join(downloaded.sourceRoot, "rulepacks", "common", "pack.json"), "utf8"), /"id": "common"/);
    } finally {
      await downloaded.cleanup();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
