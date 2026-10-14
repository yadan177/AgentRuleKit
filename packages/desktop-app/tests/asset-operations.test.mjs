import assert from "node:assert/strict";
import { chmod, lstat, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url);
const { PluginLibrary } = require("../build/plugin-library.cjs");
const { AssetOperations } = require("../build/asset-operations.cjs");
async function setup() {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "agentrule-user-assets-")));
  const home = path.join(root, "user"); await mkdir(home);
  const library = new PluginLibrary(path.join(root, "library"));
  return { root, home, library, operations: new AssetOperations(library, path.join(root, "state"), { userHome: home, codexHome: path.join(home, ".codex") }) };
}
async function skill(root, library, version, body = "Read [reference](resources/guide.md).") {
  const source = path.join(root, `skill-${version}`); await mkdir(path.join(source, "resources"), { recursive: true });
  await writeFile(path.join(source, "SKILL.md"), `---\nname: sample-skill\ndescription: Test a local user installation\nmetadata:\n  version: ${version}\n---\n${body}\n`);
  await writeFile(path.join(source, "resources/guide.md"), `Guide ${version}\n`);
  await writeFile(path.join(source, "resources/image.bin"), Buffer.from([0, 255, 17]));
  await writeFile(path.join(source, "resources/helper.sh"), "#!/bin/sh\nexit 0\n");
  if (process.platform !== "win32") await chmod(path.join(source, "resources/helper.sh"), 0o755);
  const inspected = await library.inspect(source); return library.import(source, inspected.sourceDigest);
}
test("独立 Skill 在两个软件用户环境完成预览、安装、更新、离线卸载，保留未知文件", async () => {
  const { root, home, library, operations } = await setup();
  try {
    const first = await skill(root, library, "1.0.0"); const second = await skill(root, library, "1.1.0");
    for (const ide of ["codex", "traework"]) {
      const expected = path.join(home, ide === "codex" ? ".agents/skills" : ".trae-cn/skills", "sample-skill");
      const preview = await operations.preview("install", first.key, ide);
      assert.equal(preview.destination, expected); assert.deepEqual(preview.conflicts, []);
      await assert.rejects(readFile(path.join(expected, "SKILL.md")), /ENOENT/);
      assert.equal((await operations.apply(preview.token)).find((item) => item.target.ideId === ide).version, "1.0.0");
      assert.deepEqual(await readFile(path.join(expected, "resources/image.bin")), Buffer.from([0, 255, 17]));
      if (process.platform !== "win32") assert.equal((await lstat(path.join(expected, "resources/helper.sh"))).mode & 0o777, 0o755);
      await writeFile(path.join(expected, "user-note.txt"), "Owned by the user\n");
      await writeFile(path.join(expected, "toString"), "Unknown user file\n");
      const update = await operations.preview("update", second.key, ide, "skill-sample-skill");
      assert.deepEqual(new Set(update.retainedPaths), new Set(["user-note.txt", "toString"]));
      await operations.apply(update.token);
      assert.equal(await readFile(path.join(expected, "resources/guide.md"), "utf8"), "Guide 1.1.0\n");
      const uninstall = await operations.preview("uninstall", "", ide, "skill-sample-skill");
      await operations.apply(uninstall.token);
      assert.equal(await readFile(path.join(expected, "user-note.txt"), "utf8"), "Owned by the user\n");
      assert.equal(await readFile(path.join(expected, "toString"), "utf8"), "Unknown user file\n");
      await assert.rejects(readFile(path.join(expected, "SKILL.md")), /ENOENT/);
    }
    assert.deepEqual(await operations.list(), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("拒绝未知目录、受管漂移、过期预览和来源快照变化", async () => {
  const { root, home, library, operations } = await setup();
  try {
    const source = await skill(root, library, "1.0.0");
    const destination = path.join(home, ".agents/skills/sample-skill");
    await mkdir(destination, { recursive: true }); await writeFile(path.join(destination, "custom.txt"), "user");
    const collision = await operations.preview("install", source.key, "codex");
    assert.match(collision.conflicts.join(), /未知/); await assert.rejects(operations.apply(collision.token), /冲突/);
    await rm(destination, { recursive: true });
    const preview = await operations.preview("install", source.key, "codex");
    await mkdir(destination); await writeFile(path.join(destination, "new.txt"), "changed after preview");
    await assert.rejects(operations.apply(preview.token), /预览后发生变化/);
    assert.equal(await readFile(path.join(destination, "new.txt"), "utf8"), "changed after preview");
    await rm(destination, { recursive: true });
    await operations.apply((await operations.preview("install", source.key, "codex")).token);
    await writeFile(path.join(destination, "SKILL.md"), "manually edited");
    const drift = await operations.preview("uninstall", "", "codex", "skill-sample-skill");
    assert.match(drift.conflicts.join(), /修改/); await assert.rejects(operations.apply(drift.token), /冲突/);
    await writeFile(path.join(root, "library", source.key, "source/resources/guide.md"), "tampered");
    await assert.rejects(operations.preview("install", source.key, "traework"), /发生变化/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("用户技能目录中的符号链接不被跟随", { skip: process.platform === "win32" }, async () => {
  const { root, home, library, operations } = await setup();
  try {
    const source = await skill(root, library, "1.0.0"); const outside = path.join(root, "outside"); await mkdir(outside);
    await mkdir(path.join(home, ".agents")); await symlink(outside, path.join(home, ".agents/skills"));
    await assert.rejects(operations.preview("install", source.key, "codex"), /链接/);
    await assert.rejects(readFile(path.join(outside, "sample-skill/SKILL.md")), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("没有版本号的独立 Skill 以内容版本保存，可导入后续更新", async () => {
  const { root, library } = await setup();
  try {
    const source = path.join(root, "unversioned"); await mkdir(source);
    await writeFile(path.join(source, "SKILL.md"), "---\nname: unversioned\ndescription: Test fixture\n---\nFirst\n");
    const first = await library.inspect(source); await library.import(source, first.sourceDigest);
    await writeFile(path.join(source, "SKILL.md"), "---\nname: unversioned\ndescription: Test fixture\n---\nSecond\n");
    const second = await library.inspect(source); await library.import(source, second.sourceDigest);
    assert.notEqual(first.key, second.key); assert.equal((await library.list()).length, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("Codex 安装失败时撤回工具箱交付文件，未留下成功记录", async () => {
  const { root, home, library } = await setup();
  try {
    const source = path.join(root, "plugin"); await mkdir(path.join(source, ".codex-plugin"), { recursive: true });
    await writeFile(path.join(source, ".codex-plugin/plugin.json"), JSON.stringify({ name: "failure", version: "1.0.0", description: "Failure fixture" }));
    const checked = await library.inspect(source); const item = await library.import(source, checked.sourceDigest);
    let rolledBack = false;
    const host = { inspect: async () => ({ installed: false }), install: async () => { throw new Error("fixture host failure"); }, remove: async () => { rolledBack = true; } };
    const state = path.join(root, "state"); const operations = new AssetOperations(library, state, { userHome: home, host });
    const preview = await operations.preview("install", item.key, "codex");
    await assert.rejects(operations.apply(preview.token), /fixture host failure/);
    assert.equal(rolledBack, true); assert.deepEqual(await operations.list(), []);
    await assert.rejects(readFile(path.join(state, "codex/failure/plugins/failure/.codex-plugin/plugin.json")), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("真实 Codex CLI 在隔离用户环境完成插件安装、更新、漂移拒绝和卸载", { skip: !process.env.AGENTRULEKIT_CODEX_CLI }, async () => {
  const { root, home, library } = await setup();
  try {
    const codexHome = path.join(home, ".codex"); await mkdir(codexHome);
    await writeFile(path.join(codexHome, "config.toml"), 'model = "installer-fixture"\n');
    const operations = new AssetOperations(library, path.join(root, "state"), { userHome: home, codexHome, findCli: async () => process.env.AGENTRULEKIT_CODEX_CLI });
    for (const version of ["1.0.0", "1.1.0"]) {
      const source = path.join(root, `plugin-${version}`); await mkdir(path.join(source, ".codex-plugin"), { recursive: true });
      await mkdir(path.join(source, "skills/sample"), { recursive: true });
      await writeFile(path.join(source, version === "1.0.0" ? ".codex-plugin/plugin.json" : "plugin.json"), JSON.stringify({ name: "installer-fixture", version, description: "Explicit local installer fixture", ...(version === "1.0.0" ? { skills: "./skills/" } : {}) }));
      await writeFile(path.join(source, "skills/sample/SKILL.md"), `---\nname: sample\ndescription: Explicit installer fixture only\n---\nVersion ${version}\n`);
      const inspected = await library.inspect(source); const imported = await library.import(source, inspected.sourceDigest);
      const preview = await operations.preview(version === "1.0.0" ? "install" : "update", imported.key, "codex", version === "1.0.0" ? undefined : "plugin-installer-fixture");
      assert.deepEqual(preview.conflicts, []);
      const result = await operations.apply(preview.token);
      assert.equal(result[0].version, version); assert.deepEqual(result[0].issues, []); assert.equal(result[0].recognition, "host-verified");
    }
    const installed = (await operations.list())[0];
    const nativeFile = path.join(installed.host.activePath, "skills/sample/SKILL.md");
    const original = await readFile(nativeFile); await writeFile(nativeFile, "user changed cached skill");
    const drift = await operations.preview("uninstall", "", "codex", installed.id);
    assert.match(drift.conflicts.join(), /缓存/); await assert.rejects(operations.apply(drift.token), /预览后发生变化/);
    await writeFile(nativeFile, original);
    const uninstall = await operations.preview("uninstall", "", "codex", installed.id);
    assert.deepEqual(await operations.apply(uninstall.token), []);
    assert.match(await readFile(path.join(codexHome, "config.toml"), "utf8"), /model = "installer-fixture"/);
    await assert.rejects(readFile(nativeFile), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
