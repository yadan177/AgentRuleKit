import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { unzipSync, strFromU8 } from "fflate";
import test from "node:test";
const require = createRequire(import.meta.url);
const { PluginLibrary } = require("../build/plugin-library.cjs");
const { AssetOperations } = require("../build/asset-operations.cjs");
const skills = ["audit", "design-qa", "get-context", "ideate", "image-to-code", "index", "research", "share", "url-to-code", "user-context"];
async function fixture(root, overrides = {}) {
  await mkdir(path.join(root, ".codex-plugin"), { recursive: true });
  await writeFile(path.join(root, ".codex-plugin/plugin.json"), JSON.stringify({ name: "product-design", version: "0.1.56", skills: "./skills/", license: "Proprietary", author: { name: "Fixture author" }, ...overrides }));
  for (const skill of skills) {
    await mkdir(path.join(root, "skills", skill), { recursive: true });
    await writeFile(path.join(root, "skills", skill, "SKILL.md"), `---\nname: ${skill}\ndescription: Test workflow fixture\n---\nRead [shared](../../references/critical-overrides.md).\n`);
  }
  await mkdir(path.join(root, "references"));
  await writeFile(path.join(root, "references/critical-overrides.md"), "Test fixture shared constraints\n");
  await writeFile(path.join(root, "references/communication-protocol.md"), "Test fixture communication\n");
  await mkdir(path.join(root, "assets"));
  await writeFile(path.join(root, "assets/example.bin"), Buffer.from([0, 255, 4]));
}
test("TraeWork 直接安装保留适配入口引用的来源记录及完整源文件，卸载不影响导入库", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "toolbox-trae-install-")));
  try {
    const source = path.join(root, "source"); await fixture(source);
    const library = new PluginLibrary(path.join(root, "library"));
    const inspected = await library.inspect(source); const item = await library.import(source, inspected.sourceDigest);
    const home = path.join(root, "user"); await mkdir(home);
    const operations = new AssetOperations(library, path.join(root, "state"), { userHome: home });
    const plan = await operations.preview("install", item.key, "traework");
    assert.deepEqual(plan.conflicts, []);
    assert.ok(plan.changes.some((file) => file.path === "provenance.json"));
    const [installed] = await operations.apply(plan.token);
    const provenance = JSON.parse(await readFile(path.join(installed.destination, "provenance.json"), "utf8"));
    assert.equal(provenance.sourceDigest, item.sourceDigest);
    assert.equal(provenance.verification, "files-installed-not-runtime-verified");
    for (const file of item.files) assert.deepEqual(await readFile(path.join(installed.destination, "source", file.path)), await readFile(path.join(source, file.path)));
    await operations.apply((await operations.preview("uninstall", "", "traework", installed.id)).token);
    assert.equal((await library.list())[0].key, item.key);
    await assert.rejects(readFile(path.join(installed.destination, "SKILL.md")), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("本机导入完整源包，跨实例可读取，导出保持原文与相对引用", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "toolbox-import-"));
  try {
    const source = path.join(root, "source"); const libraryRoot = path.join(root, "library");
    await fixture(source);
    const library = new PluginLibrary(libraryRoot); const preview = await library.inspect(source);
    assert.equal(preview.delivery, "traework-skill"); assert.equal(preview.license, "Proprietary");
    const item = await library.import(source, preview.sourceDigest);
    assert.equal((await new PluginLibrary(libraryRoot).list())[0].sourceDigest, preview.sourceDigest);
    const zipPath = path.join(root, "delivery.zip");
    const result = await library.exportTraeWork(item.key, zipPath);
    const archive = unzipSync(await readFile(zipPath));
    assert.match(strFromU8(archive["SKILL.md"]), /name: toolbox-product-design/);
    assert.deepEqual(Buffer.from(archive["source/assets/example.bin"]), Buffer.from([0, 255, 4]));
    for (const file of item.files) assert.deepEqual(Buffer.from(archive[`source/${file.path}`]), await readFile(path.join(source, file.path)));
    assert.match(strFromU8(archive["source/skills/audit/SKILL.md"]), /\.\.\/\.\.\/references\/critical-overrides.md/);
    const provenance = JSON.parse(strFromU8(archive["provenance.json"]));
    assert.equal(provenance.sourceDigest, result.sourceDigest); assert.equal(provenance.verification, "exported-not-installed");
    await assert.rejects(library.exportTraeWork(item.key, zipPath), /EEXIST/);
    await assert.rejects(library.import(source, preview.sourceDigest), /已导入/);
    await writeFile(path.join(libraryRoot, item.key, "source/assets/example.bin"), "tampered");
    await assert.rejects(library.exportTraeWork(item.key, path.join(root, "another.zip")), /发生变化/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("预览后源文件变化、链接和路径逃逸都不能导入", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "toolbox-import-guards-"));
  try {
    const source = path.join(root, "source"); await fixture(source);
    const library = new PluginLibrary(path.join(root, "library")); const preview = await library.inspect(source);
    await writeFile(path.join(source, "assets/example.bin"), "changed");
    await assert.rejects(library.import(source, preview.sourceDigest), /发生变化/);
    await symlink(path.join(source, "assets/example.bin"), path.join(source, "linked"));
    await assert.rejects(library.inspect(source), /链接/);
    await assert.rejects(library.exportTraeWork("../other", path.join(root, "escape.zip")), /标识无效/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("未知插件、未知版本或含 MCP/Hook 的包只保留来源，不宣称可移植", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "toolbox-import-runtime-"));
  try {
    for (const [id, overrides] of Object.entries({ unknown: { name: "other-plugin" }, version: { version: "0.1.57" }, mcp: { mcpServers: "./mcp.json" }, hook: { hooks: "./hooks.json" } })) {
      const source = path.join(root, id); await fixture(source, overrides);
      const library = new PluginLibrary(path.join(root, `${id}-library`)); const preview = await library.inspect(source);
      assert.equal(preview.delivery, "unsupported");
      const imported = await library.import(source, preview.sourceDigest);
      await assert.rejects(library.exportTraeWork(imported.key, path.join(root, `${id}.zip`)), /尚无 TraeWork 适配/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
