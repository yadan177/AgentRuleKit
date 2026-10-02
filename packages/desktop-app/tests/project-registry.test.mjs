import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { ProjectRegistry } = require("../build/project-registry.cjs");

test("工具箱项目列表跨实例保留且不修改项目内容", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "toolbox-projects-"));
  try {
    const one = path.join(directory, "one");
    const two = path.join(directory, "two");
    await mkdir(one); await mkdir(two);
    await writeFile(path.join(one, "AGENTS.md"), "原有规则\n");
    const file = path.join(directory, "settings", "projects.json");
    const registry = new ProjectRegistry(file);
    await Promise.all([registry.add(one), registry.add(two), registry.add(one)]);
    const reopened = new ProjectRegistry(file);
    assert.deepEqual((await reopened.list()).map((project) => project.root), [await realpath(one), await realpath(two)]);
    assert.equal(await readFile(path.join(one, "AGENTS.md"), "utf8"), "原有规则\n");
    await reopened.remove(await realpath(one));
    assert.deepEqual((await reopened.list()).map((project) => project.root), [await realpath(two)]);
    assert.equal(await readFile(path.join(one, "AGENTS.md"), "utf8"), "原有规则\n");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("项目列表损坏或新版本时拒绝覆盖原数据", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "toolbox-projects-invalid-"));
  try {
    const file = path.join(directory, "projects.json");
    const registry = new ProjectRegistry(file);
    await writeFile(file, "{broken");
    await assert.rejects(registry.add(directory), /已损坏/);
    assert.equal(await readFile(file, "utf8"), "{broken");
    await writeFile(file, '{"schemaVersion":2,"projects":[]}');
    await assert.rejects(registry.add(directory), /不受支持/);
    assert.equal(await readFile(file, "utf8"), '{"schemaVersion":2,"projects":[]}');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
