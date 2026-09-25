import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const packageInfo = JSON.parse(await readFile(path.join(repository, "packages/cli/package.json"), "utf8"));
const expectedVersion = process.argv[2] ?? packageInfo.version;
if (!/^\d+\.\d+\.\d+$/.test(expectedVersion)) {
  throw new Error("需要稳定版号，例如 0.1.0");
}

function run(executable, args, cwd = repository) {
  const result = spawnSync(executable, args, { cwd, encoding: "utf8", timeout: 120_000 });
  assert.equal(result.status, 0, `${executable} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "请通过 npm run smoke:public 启动");
const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-public-smoke-"));

try {
  const packed = JSON.parse(run(process.execPath, [npmCli, "pack", "--workspace", "agentrulekit", "--pack-destination", root, "--json"]));
  const archive = path.join(root, packed[0].filename);
  const install = path.join(root, "installed");
  run(process.execPath, [npmCli, "install", "--prefix", install, archive, "--ignore-scripts", "--no-audit", "--no-fund"]);
  const cli = path.join(install, "node_modules", "agentrulekit", "dist", "index.js");
  assert.equal(run(process.execPath, [cli, "--version"]).trim(), packageInfo.version);

  const fixtures = [
    { name: "go", marker: "go.mod", content: "module example.com/smoke\n\ngo 1.22\n", packs: ["common", "go", "project-docs/go"] },
    { name: "typescript", marker: "tsconfig.json", content: "{}\n", packs: ["common", "javascript", "typescript", "project-docs/js-ts"] },
    { name: "unity", marker: path.join("ProjectSettings", "ProjectVersion.txt"), content: "m_EditorVersion: 2022.3.0f1\n", packs: ["common", "unity", "project-docs/unity"] },
  ];
  let sourceIdentity;

  for (const fixture of fixtures) {
    const project = path.join(root, fixture.name);
    const marker = path.join(project, fixture.marker);
    await mkdir(path.dirname(marker), { recursive: true });
    await writeFile(marker, fixture.content);
    const detection = JSON.parse(run(process.execPath, [cli, "detect", project]));
    assert.ok(detection.stacks.some((stack) => stack.id === fixture.name), `${fixture.name} 技术栈识别失败`);
    run(process.execPath, [cli, "init", project]);

    const lock = JSON.parse(await readFile(path.join(project, ".agent-rules.lock.json"), "utf8"));
    assert.equal(lock.sourceType, "github");
    assert.equal(lock.source, "yadan177/AgentRuleKit");
    assert.equal(lock.sourceVersion, expectedVersion);
    assert.match(lock.sourceDigest, /^sha256:[a-f0-9]{64}$/);
    assert.match(lock.sourceCommit, /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/);
    const identity = [lock.sourceVersion, lock.sourceDigest, lock.sourceCommit];
    if (sourceIdentity) assert.deepEqual(identity, sourceIdentity, "工程应使用同一个正式 Release");
    sourceIdentity = identity;
    for (const pack of fixture.packs) assert.ok(lock.rulepacks[pack], `${fixture.name} 缺少规则包 ${pack}`);

    assert.match(run(process.execPath, [cli, "validate", project]), /验证通过/);
    assert.match(run(process.execPath, [cli, "check", project]), /最新版本/);
    run(process.execPath, [cli, "diff", project]);
    run(process.execPath, [cli, "update", project, "--apply"]);
    assert.deepEqual(JSON.parse(await readFile(path.join(project, ".agent-rules.lock.json"), "utf8")), lock);
    assert.match(run(process.execPath, [cli, "validate", project]), /验证通过/);
    console.log(`${fixture.name}: 公开 Release ${expectedVersion} 安装与同版本检查通过`);
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
