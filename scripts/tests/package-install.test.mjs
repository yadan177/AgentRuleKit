import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../", import.meta.url));

function run(executable, args, cwd = repository) {
  const result = spawnSync(executable, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${executable} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

test("npm 包脱离工作区后仍可独立安装和初始化项目", async () => {
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, "测试须通过 npm run check 启动");
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-package-"));
  try {
    const packed = JSON.parse(run(process.execPath, [npmCli, "pack", "--workspace", "agentrulekit", "--pack-destination", root, "--json"]));
    const archive = path.join(root, packed[0].filename);
    const install = path.join(root, "installed");
    run(process.execPath, [npmCli, "install", "--prefix", install, archive, "--ignore-scripts", "--no-audit", "--no-fund"]);
    const cli = path.join(install, "node_modules", "agentrulekit", "dist", "index.js");
    assert.equal(run(process.execPath, [cli, "--version"]).trim(), "0.1.0");
    const project = path.join(root, "project");
    await mkdir(project);
    await writeFile(path.join(project, "pyproject.toml"), "[project]\nname = 'packaged-demo'\n");
    run(process.execPath, [cli, "init", project, "--source-workspace", repository]);
    assert.match(run(process.execPath, [cli, "validate", project]), /验证通过/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
