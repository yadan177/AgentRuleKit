import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { stringify } from "yaml";

import {
  detectProject,
  initializeProject,
  planProject,
  applyProject,
  loadProjectConfig,
  listInterruptedTransactions,
  recoverInterruptedProject,
  mergeManagedBlock,
  validateProject,
} from "./index.js";
import { testAdapter } from "./test-adapter.js";

async function withTempProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-rule-kit-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writePack(
  sourceRoot: string,
  id: string,
  entry: string,
  dependencies: string[] = [],
): Promise<void> {
  const directory = path.join(sourceRoot, "rulepacks", ...id.split("/"));
  await mkdir(path.dirname(path.join(directory, entry)), { recursive: true });
  await writeFile(path.join(directory, entry), `# ${id}\n`, "utf8");
  await writeFile(
    path.join(directory, "pack.json"),
    JSON.stringify({
      id,
      version: "0.1.0",
      status: "ready",
      kind: id.startsWith("project-docs/") ? "documentation" : "development",
      entry,
      dependencies,
      rules: [entry],
    }),
    "utf8",
  );
}

test("detectProject reports TypeScript evidence", async () => {
  await withTempProject(async (root) => {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ devDependencies: { typescript: "^5.0.0" } }),
    );
    const result = await detectProject(root);
    assert.deepEqual(
      result.stacks.map((stack) => stack.id),
      ["javascript", "typescript"],
    );
  });
});

test("mergeManagedBlock preserves unmanaged content", () => {
  const merged = mergeManagedBlock("# Existing\n", `${testAdapter.blockStart}\nnew\n${testAdapter.blockEnd}`, testAdapter);
  assert.match(merged, /# Existing/);
  assert.match(merged, /new/);
});

test("initializeProject creates a valid generic adapter scaffold", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target, { recursive: true });
    await writePack(source, "common", "entry.md");
    await writePack(source, "go", "entry.md", ["common"]);
    await writePack(source, "project-docs/go", "entry.md", ["common"]);
    await writeFile(path.join(target, "go.mod"), "module example.com/demo\n");
    const config = await initializeProject(target, testAdapter, source);
    assert.deepEqual(config.rulepacks, ["common", "go", "project-docs/go"]);
    assert.match(await readFile(path.join(target, testAdapter.entryFile), "utf8"), /AgentRuleKit/);
    assert.match(
      await readFile(path.join(target, ".agent-rules", "go", "entry.md"), "utf8"),
      /# go/,
    );
    assert.equal(JSON.parse(await readFile(path.join(target, ".agent-rules.lock.json"), "utf8")).sourceType, "workspace");
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
  });
});

test("更新先预览差异，应用后保留项目覆盖与非受管内容", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await writePack(source, "go", "entry.md", ["common"]);
    await writePack(source, "project-docs/go", "entry.md", ["common"]);
    await writeFile(path.join(target, "go.mod"), "module demo\n");
    await writeFile(path.join(target, testAdapter.entryFile), "# 我的项目\n\n请保留。\n");
    await initializeProject(target, testAdapter, source);
    await writeFile(path.join(target, ".agent-rules", "overrides.md"), "# 本地规则\n必须保留\n");
    await writeFile(path.join(target, ".agent-rules", "notes.md"), "个人笔记\n");
    await writeFile(path.join(source, "rulepacks", "go", "entry.md"), "# go v2\n");
    const config = await loadProjectConfig(target);
    const preview = await planProject(target, config, testAdapter);
    assert.deepEqual(preview.conflicts, []);
    assert.ok(preview.changes.some((change) => change.path === ".agent-rules/go/entry.md" && change.after === "# go v2\n"));
    assert.equal(await readFile(path.join(target, ".agent-rules", "go", "entry.md"), "utf8"), "# go\n");
    await applyProject(target, config, testAdapter);
    assert.equal(await readFile(path.join(target, ".agent-rules", "go", "entry.md"), "utf8"), "# go v2\n");
    assert.equal(await readFile(path.join(target, ".agent-rules", "overrides.md"), "utf8"), "# 本地规则\n必须保留\n");
    assert.equal(await readFile(path.join(target, ".agent-rules", "notes.md"), "utf8"), "个人笔记\n");
    assert.match(await readFile(path.join(target, testAdapter.entryFile), "utf8"), /请保留。/);
    assert.equal((await planProject(target, config, testAdapter)).changes.length, 0);
  });
});

test("未知文件冲突阻止初始化，且不留下半成品", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(path.join(target, ".agent-rules", "go"), { recursive: true });
    await writePack(source, "common", "entry.md");
    await writePack(source, "go", "entry.md", ["common"]);
    await writePack(source, "project-docs/go", "entry.md", ["common"]);
    await writeFile(path.join(target, "go.mod"), "module demo\n");
    await writeFile(path.join(target, ".agent-rules", "go", "entry.md"), "用户文件\n");
    await assert.rejects(initializeProject(target, testAdapter, source), /unknown-file-collision/);
    assert.equal(await readFile(path.join(target, ".agent-rules", "go", "entry.md"), "utf8"), "用户文件\n");
    await assert.rejects(readFile(path.join(target, "agent-rules.yaml"), "utf8"), /ENOENT/);
  });
});

test("受管文件漂移阻止更新", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const installed = path.join(target, ".agent-rules", "common", "entry.md");
    await writeFile(installed, "# 用户手改\n");
    const config = await loadProjectConfig(target);
    assert.ok((await planProject(target, config, testAdapter)).conflicts.some((issue) => issue.code === "managed-file-drift"));
    await assert.rejects(applyProject(target, config, testAdapter), /managed-file-drift/);
    assert.equal(await readFile(installed, "utf8"), "# 用户手改\n");
  });
});

test("被篡改的锁文件不能把工程根文件当作受管文件删除", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const userFile = path.join(target, "important.md");
    await writeFile(userFile, "用户文件\n");
    const lockPath = path.join(target, ".agent-rules.lock.json");
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    lock.managedFiles[".agent-rules/../important.md"] = "sha256:invalid";
    await writeFile(lockPath, JSON.stringify(lock));
    const config = await loadProjectConfig(target);
    assert.ok((await planProject(target, config, testAdapter)).conflicts.some((issue) => issue.code === "unsafe-lock-path"));
    await assert.rejects(applyProject(target, config, testAdapter), /unsafe-lock-path/);
    assert.equal(await readFile(userFile, "utf8"), "用户文件\n");
  });
});

test("自定义项目覆盖规则路径会写入目标入口并受校验", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const config = await loadProjectConfig(target);
    config.project.overrides = ".agent-rules/project-notes.md";
    await applyProject(target, config, testAdapter, stringify(config));
    assert.match(await readFile(path.join(target, testAdapter.entryFile), "utf8"), /\.agent-rules\/project-notes\.md/);
    assert.match(await readFile(path.join(target, ".agent-rules", "project-notes.md"), "utf8"), /项目覆盖规则/);
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
  });
});

test("校验能发现目标入口受控区块漂移", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const entryPath = path.join(target, testAdapter.entryFile);
    const entry = await readFile(entryPath, "utf8");
    await writeFile(entryPath, entry.replace("AgentRuleKit", "手工改写后"));
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "managed-block-drift"));
    await assert.rejects(applyProject(target, await loadProjectConfig(target), testAdapter), /managed-block-drift/);
  });
});

test("中断事务保留原目录并可显式恢复", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const transaction = path.join(target, ".agent-rules.transaction-test");
    await mkdir(transaction);
    const snapshots = {
      [testAdapter.entryFile]: await readFile(path.join(target, testAdapter.entryFile), "utf8"),
      ".agent-rules.lock.json": await readFile(path.join(target, ".agent-rules.lock.json"), "utf8"),
    };
    await writeFile(path.join(transaction, "journal.json"), JSON.stringify({ schemaVersion: 1, hadRules: true, snapshots }));
    await rename(path.join(target, ".agent-rules"), path.join(transaction, "backup"));
    assert.equal((await listInterruptedTransactions(target)).length, 1);
    await assert.rejects(planProject(target, await loadProjectConfig(target), testAdapter), /未完成的规则更新事务/);
    const recoveryCopy = await recoverInterruptedProject(target, testAdapter);
    assert.ok(recoveryCopy?.includes(".agent-rules.recovered-"));
    assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# common\n");
    assert.deepEqual(await listInterruptedTransactions(target), []);
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
  });
});
