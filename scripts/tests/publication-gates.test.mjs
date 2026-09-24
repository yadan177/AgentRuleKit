import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { c } from "tar";
import { parse } from "yaml";
import { verifyPublishedRelease } from "../verify-published-release.mjs";

const repository = fileURLToPath(new URL("../../", import.meta.url));

async function workflow(name) {
  const url = new URL(`.github/workflows/${name}`, `file://${repository}`);
  return parse(await readFile(url, "utf8"));
}

test("GitHub Release 与 npm 发布只允许在公开仓库的版本标签上运行", async () => {
  for (const [file, job] of [["ci.yml", "release"], ["publish-npm.yml", "publish"]]) {
    const parsed = await workflow(file);
    const condition = parsed.jobs?.[job]?.if;
    assert.equal(typeof condition, "string", `${file} 缺少 ${job} 作业条件`);
    assert.match(condition, /startsWith\(github\.ref,\s*'refs\/tags\/v'\)/, `${file} 必须仅在版本标签运行`);
    assert.match(condition, /github\.event\.repository\.private\s*==\s*false/, `${file} 私有仓库必须阻断发布`);
  }
});

test("npm 发布前必须核对对应 GitHub Release", async () => {
  const parsed = await workflow("publish-npm.yml");
  const steps = parsed.jobs.publish.steps;
  const verification = steps.findIndex((step) => String(step.run ?? "").includes("scripts/verify-published-release.mjs"));
  const publication = steps.findIndex((step) => String(step.run ?? "").includes("npm publish"));
  assert.ok(verification >= 0 && publication > verification, "Release 校验必须先于 npm publish");
});

test("npm 发布门禁验证 Release 标签、资产摘要与来源提交", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-publication-test-"));
  try {
    await mkdir(path.join(root, "rulepacks", "common"), { recursive: true });
    await writeFile(path.join(root, "rulepacks", "common", "pack.json"), "{}\n");
    const commit = "a".repeat(40);
    await writeFile(path.join(root, "agentrulekit-release.json"), JSON.stringify({ schemaVersion: 1, version: "0.1.0", sourceCommit: commit }));
    const archive = path.join(root, "release.tar.gz");
    await c({ gzip: true, file: archive, cwd: root }, ["agentrulekit-release.json", "rulepacks"]);
    const bytes = await readFile(archive);
    const assetUrl = "https://github.com/yadan177/AgentRuleKit/releases/download/v0.1.0/agentrulekit-rulepacks.tar.gz";
    const release = { tag_name: "v0.1.0", assets: [{ name: "agentrulekit-rulepacks.tar.gz", browser_download_url: assetUrl, digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, size: bytes.length }] };
    const fetcher = async (input) => String(input).startsWith("https://api.github.com/")
      ? new Response(JSON.stringify(release), { status: 200 })
      : new Response(new Uint8Array(bytes), { status: 200 });

    await verifyPublishedRelease("yadan177/AgentRuleKit", "v0.1.0", commit, fetcher);
    await assert.rejects(verifyPublishedRelease("yadan177/AgentRuleKit", "v0.1.0", "b".repeat(40), fetcher), /来源提交.*不一致/);
    await assert.rejects(verifyPublishedRelease("yadan177/AgentRuleKit", "v0.2.0", commit, fetcher), /标签.*不一致/);
    release.tag_name = "0.1.0";
    await assert.rejects(verifyPublishedRelease("yadan177/AgentRuleKit", "v0.1.0", commit, fetcher), /标签.*不一致/);
    release.tag_name = "v0.1.0";
    release.draft = true;
    await assert.rejects(verifyPublishedRelease("yadan177/AgentRuleKit", "v0.1.0", commit, fetcher), /尚未正式发布/);
    release.draft = false;
    release.assets[0].digest = `sha256:${"0".repeat(64)}`;
    await assert.rejects(verifyPublishedRelease("yadan177/AgentRuleKit", "v0.1.0", commit, fetcher), /SHA-256/);
    const missing = async () => new Response("not found", { status: 404 });
    await assert.rejects(verifyPublishedRelease("yadan177/AgentRuleKit", "v0.1.0", commit, missing), /HTTP 404/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
