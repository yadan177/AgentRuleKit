import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { stringify } from "yaml";

import {
  CODEX_BLOCK_START,
  detectProject,
  initializeProject,
  planCodexProject,
  applyCodexProject,
  loadProjectConfig,
  listInterruptedTransactions,
  recoverInterruptedProject,
  mergeManagedBlock,
  validateProject,
} from "./index.js";

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
  const merged = mergeManagedBlock("# Existing\n", `${CODEX_BLOCK_START}\nnew\n<!-- agent-rule:end -->`);
  assert.match(merged, /# Existing/);
  assert.match(merged, /new/);
});

test("initializeProject creates a valid Codex scaffold", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target, { recursive: true });
    await writePack(source, "common", "entry.md");
    await writePack(source, "go", "entry.md", ["common"]);
    await writePack(source, "project-docs/go", "entry.md", ["common"]);
    await writeFile(path.join(target, "go.mod"), "module example.com/demo\n");
    const config = await initializeProject(target, source);
    assert.deepEqual(config.rulepacks, ["common", "go", "project-docs/go"]);
    assert.match(await readFile(path.join(target, "AGENTS.md"), "utf8"), /AgentRuleKit/);
    assert.match(
      await readFile(path.join(target, ".agent-rules", "go", "entry.md"), "utf8"),
      /# go/,
    );
    assert.equal(JSON.parse(await readFile(path.join(target, ".agent-rules.lock.json"), "utf8")).sourceType, "workspace");
    assert.deepEqual(await validateProject(target), { valid: true, issues: [] });
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
    await writeFile(path.join(target, "AGENTS.md"), "# 我的项目\n\n请保留。\n");
    await initializeProject(target, source);
    await writeFile(path.join(target, ".agent-rules", "overrides.md"), "# 本地规则\n必须保留\n");
    await writeFile(path.join(target, ".agent-rules", "notes.md"), "个人笔记\n");
    await writeFile(path.join(source, "rulepacks", "go", "entry.md"), "# go v2\n");
    const config = await loadProjectConfig(target);
    const preview = await planCodexProject(target, config);
    assert.deepEqual(preview.conflicts, []);
    assert.ok(preview.changes.some((change) => change.path === ".agent-rules/go/entry.md" && change.after === "# go v2\n"));
    assert.equal(await readFile(path.join(target, ".agent-rules", "go", "entry.md"), "utf8"), "# go\n");
    await applyCodexProject(target, config);
    assert.equal(await readFile(path.join(target, ".agent-rules", "go", "entry.md"), "utf8"), "# go v2\n");
    assert.equal(await readFile(path.join(target, ".agent-rules", "overrides.md"), "utf8"), "# 本地规则\n必须保留\n");
    assert.equal(await readFile(path.join(target, ".agent-rules", "notes.md"), "utf8"), "个人笔记\n");
    assert.match(await readFile(path.join(target, "AGENTS.md"), "utf8"), /请保留。/);
    assert.equal((await planCodexProject(target, config)).changes.length, 0);
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
    await assert.rejects(initializeProject(target, source), /unknown-file-collision/);
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
    await initializeProject(target, source);
    const installed = path.join(target, ".agent-rules", "common", "entry.md");
    await writeFile(installed, "# 用户手改\n");
    const config = await loadProjectConfig(target);
    assert.ok((await planCodexProject(target, config)).conflicts.some((issue) => issue.code === "managed-file-drift"));
    await assert.rejects(applyCodexProject(target, config), /managed-file-drift/);
    assert.equal(await readFile(installed, "utf8"), "# 用户手改\n");
  });
});

test("自定义项目覆盖规则路径会写入 Codex 入口并受校验", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, source);
    const config = await loadProjectConfig(target);
    config.project.overrides = ".agent-rules/project-notes.md";
    await applyCodexProject(target, config, stringify(config));
    assert.match(await readFile(path.join(target, "AGENTS.md"), "utf8"), /\.agent-rules\/project-notes\.md/);
    assert.match(await readFile(path.join(target, ".agent-rules", "project-notes.md"), "utf8"), /项目覆盖规则/);
    assert.deepEqual(await validateProject(target), { valid: true, issues: [] });
  });
});

test("校验能发现 AGENTS.md 受控区块漂移", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, source);
    const agentsPath = path.join(target, "AGENTS.md");
    const agents = await readFile(agentsPath, "utf8");
    await writeFile(agentsPath, agents.replace("修改工程前", "手工改写后"));
    assert.ok((await validateProject(target)).issues.some((issue) => issue.code === "managed-block-drift"));
    await assert.rejects(applyCodexProject(target, await loadProjectConfig(target)), /managed-block-drift/);
  });
});

test("中断事务保留原目录并可显式恢复", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, source);
    const transaction = path.join(target, ".agent-rules.transaction-test");
    await mkdir(transaction);
    const snapshots = {
      "AGENTS.md": await readFile(path.join(target, "AGENTS.md"), "utf8"),
      ".agent-rules.lock.json": await readFile(path.join(target, ".agent-rules.lock.json"), "utf8"),
    };
    await writeFile(path.join(transaction, "journal.json"), JSON.stringify({ schemaVersion: 1, hadRules: true, snapshots }));
    await rename(path.join(target, ".agent-rules"), path.join(transaction, "backup"));
    assert.equal((await listInterruptedTransactions(target)).length, 1);
    await assert.rejects(planCodexProject(target, await loadProjectConfig(target)), /未完成的规则更新事务/);
    const recoveryCopy = await recoverInterruptedProject(target);
    assert.ok(recoveryCopy?.includes(".agent-rules.recovered-"));
    assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# common\n");
    assert.deepEqual(await listInterruptedTransactions(target), []);
    assert.deepEqual(await validateProject(target), { valid: true, issues: [] });
  });
});
