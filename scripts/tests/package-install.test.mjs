import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

test("独立 npm 包可在六类工程初始化，并完成 Go 工程的显式更新", async () => {
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, "测试须通过 npm run check 启动");
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-package-"));
  try {
    const packed = JSON.parse(run(process.execPath, [npmCli, "pack", "--workspace", "agentrulekit", "--pack-destination", root, "--json"]));
    assert.ok(packed[0].files.some((file) => file.path === "README.md"), "npm 包必须包含中文安装说明");
    assert.ok(packed[0].files.some((file) => file.path === "LICENSE"), "npm 包必须包含许可证");
    const archive = path.join(root, packed[0].filename);
    const install = path.join(root, "installed");
    run(process.execPath, [npmCli, "install", "--prefix", install, archive, "--ignore-scripts", "--no-audit", "--no-fund"]);
    const cli = path.join(install, "node_modules", "agentrulekit", "dist", "index.js");
    assert.equal(run(process.execPath, [cli, "--version"]).trim(), "0.1.0");
    assert.equal(run(process.execPath, [npmCli, "exec", "--prefix", install, "--", "agent-rule", "--version"]).trim(), "0.1.0");
    const source = path.join(root, "source");
    await cp(path.join(repository, "rulepacks"), path.join(source, "rulepacks"), { recursive: true });
    const fixtures = [
      { name: "python", marker: "pyproject.toml", content: "[project]\nname = 'packaged-demo'\n", packs: ["python", "project-docs/python"] },
      { name: "go", marker: "go.mod", content: "module example.com/demo\n\ngo 1.22\n", packs: ["go", "project-docs/go"] },
      { name: "java", marker: "pom.xml", content: "<project/>\n", packs: ["java", "project-docs/java"] },
      { name: "javascript", marker: "package.json", content: '{"name":"packaged-demo"}\n', packs: ["javascript", "project-docs/js-ts"] },
      { name: "typescript", marker: "tsconfig.json", content: "{}\n", packs: ["javascript", "typescript", "project-docs/js-ts"] },
      { name: "unity", marker: path.join("ProjectSettings", "ProjectVersion.txt"), content: "m_EditorVersion: 2022.3.0f1\n", packs: ["unity", "project-docs/unity"] },
    ];
    for (const fixture of fixtures) {
      const project = path.join(root, fixture.name);
      const marker = path.join(project, fixture.marker);
      await mkdir(path.dirname(marker), { recursive: true });
      await writeFile(marker, fixture.content);
      const detection = JSON.parse(run(process.execPath, [cli, "detect", project]));
      assert.ok(detection.stacks.some((stack) => stack.id === fixture.name), `${fixture.name} 未正确检测`);
      const initialized = run(process.execPath, [cli, "init", project, "--source-workspace", source]);
      assert.ok(initialized.includes(fixture.marker), `${fixture.name} 未展示检测依据`);
      assert.match(initialized, /建议规则包：common/);
      assert.match(run(process.execPath, [cli, "validate", project]), /验证通过/);
      assert.match(run(process.execPath, [cli, "check", project]), /最新版本/);
      const lock = JSON.parse(await readFile(path.join(project, ".agent-rules.lock.json"), "utf8"));
      for (const pack of ["common", ...fixture.packs]) assert.ok(lock.rulepacks[pack], `${fixture.name} 未安装 ${pack}`);
      const codexEntry = await readFile(path.join(project, "AGENTS.md"), "utf8");
      assert.ok(codexEntry.indexOf(".agent-rules/overrides.md") < codexEntry.indexOf("已配置规则包"), `${fixture.name} 未优先提示项目覆盖规则`);
      const listed = new Map([...codexEntry.matchAll(/^- `([^`]+)`：`([^`]+)`$/gm)].map((match) => [match[1], match[2]]));
      assert.equal(listed.size, Object.keys(lock.rulepacks).length, `${fixture.name} 的 Codex 入口未列出全部已安装规则包`);
      for (const id of Object.keys(lock.rulepacks)) {
        const manifest = JSON.parse(await readFile(path.join(project, ".agent-rules", id, "pack.json"), "utf8"));
        const expectedEntry = `.agent-rules/${id}/${manifest.entry}`;
        assert.equal(listed.get(id), expectedEntry, `${fixture.name} 的 ${id} 入口路径不一致`);
        assert.ok((await readFile(path.join(project, expectedEntry), "utf8")).length > 0, `${fixture.name} 的 ${id} 入口文件为空`);
      }
    }

    const goProject = path.join(root, "go");
    const installedRule = path.join(goProject, ".agent-rules", "common", "entry.md");
    const overrides = path.join(goProject, ".agent-rules", "overrides.md");
    const original = await readFile(installedRule, "utf8");
    await writeFile(overrides, "# Go 项目本地规则\n保留这段内容。\n");
    const sourceRule = path.join(source, "rulepacks", "common", "entry.md");
    await writeFile(sourceRule, `${await readFile(sourceRule, "utf8")}\n打包 CLI 的更新测试。\n`);
    const preview = run(process.execPath, [cli, "diff", goProject]);
    assert.match(preview, /打包 CLI 的更新测试/);
    assert.equal(await readFile(installedRule, "utf8"), original, "预览不能修改项目");
    run(process.execPath, [cli, "update", goProject, "--apply"]);
    assert.match(await readFile(installedRule, "utf8"), /打包 CLI 的更新测试/);
    assert.equal(await readFile(overrides, "utf8"), "# Go 项目本地规则\n保留这段内容。\n");
    assert.match(run(process.execPath, [cli, "validate", goProject]), /验证通过/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
