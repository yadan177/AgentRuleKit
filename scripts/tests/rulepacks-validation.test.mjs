import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateRulepacks } from "../validate-rulepacks.mjs";

async function withRulepacks(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-rulepacks-"));
  try { await run(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}

async function writePack(root, id, dependencies = []) {
  const directory = path.join(root, id);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "entry.md"), "# 入口\n\n[自身](./entry.md#入口)\n");
  await writeFile(path.join(directory, "pack.json"), JSON.stringify({
    id, version: "0.1.0", status: "ready", kind: "common", entry: "entry.md",
    rules: ["entry.md"], dependencies,
  }));
}

test("规则源校验接受完整 manifest 和本地标题链接", async () => {
  await withRulepacks(async (root) => {
    await writePack(root, "common");
    assert.deepEqual(await validateRulepacks(root, "0.1.0"), { packs: 1, files: 1, issues: [] });
  });
});

test("规则源校验发现未登记文件、失效链接和过期版本", async () => {
  await withRulepacks(async (root) => {
    await writePack(root, "common");
    await writeFile(path.join(root, "common", "extra.md"), "[缺失](./missing.md)\n");
    const result = await validateRulepacks(root, "0.2.0");
    assert.ok(result.issues.some((issue) => issue.includes("未列入任何 manifest")));
    assert.ok(result.issues.some((issue) => issue.includes("本地链接目标不存在")));
    assert.ok(result.issues.some((issue) => issue.includes("版本与 CLI 不一致")));
  });
});

test("规则源校验发现依赖循环和不安全文件路径", async () => {
  await withRulepacks(async (root) => {
    await writePack(root, "one", ["two"]);
    await writePack(root, "two", ["one"]);
    const manifest = path.join(root, "one", "pack.json");
    await writeFile(manifest, JSON.stringify({
      id: "one", version: "0.1.0", status: "ready", kind: "common", entry: "entry.md",
      rules: ["entry.md", "../outside.md"], dependencies: ["two"],
    }));
    const result = await validateRulepacks(root, "0.1.0");
    assert.ok(result.issues.some((issue) => issue.includes("依赖形成循环")));
    assert.ok(result.issues.some((issue) => issue.includes("路径不安全")));
  });
});

test("跨规则包链接必须声明可传递的依赖", async () => {
  await withRulepacks(async (root) => {
    await writePack(root, "base");
    await writePack(root, "feature");
    await writeFile(path.join(root, "feature", "entry.md"), "# 入口\n\n[基础规则](../base/entry.md)\n");
    assert.ok((await validateRulepacks(root, "0.1.0")).issues.some((issue) => issue.includes("跨规则包链接缺少必需依赖")));
    await writePack(root, "feature", ["base"]);
    await writeFile(path.join(root, "feature", "entry.md"), "# 入口\n\n[基础规则](../base/entry.md)\n");
    assert.deepEqual((await validateRulepacks(root, "0.1.0")).issues, []);
  });
});
