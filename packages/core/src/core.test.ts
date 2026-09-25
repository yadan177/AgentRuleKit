import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
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

test("没有 package.json 的 TypeScript 工程仍安装匹配规则及其依赖", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await writePack(source, "javascript", "entry.md", ["common"]);
    await writePack(source, "typescript", "entry.md", ["common", "javascript"]);
    await writePack(source, "project-docs/js-ts", "entry.md", ["common"]);
    await writeFile(path.join(target, "tsconfig.json"), "{}\n");

    const detection = await detectProject(target);
    assert.deepEqual(detection.stacks.map((stack) => stack.id), ["typescript"]);
    assert.deepEqual(detection.stacks[0]?.evidence, [{ path: "tsconfig.json", reason: "存在 TypeScript 配置文件" }]);

    const config = await initializeProject(target, testAdapter, source);
    assert.deepEqual(config.rulepacks, ["common", "typescript", "project-docs/js-ts"]);
    const lock = JSON.parse(await readFile(path.join(target, ".agent-rules.lock.json"), "utf8"));
    assert.deepEqual(Object.keys(lock.rulepacks), ["common", "javascript", "typescript", "project-docs/js-ts"]);
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
  });
});

test("损坏的 package.json 不会遮蔽独立的 tsconfig.json 证据", async () => {
  await withTempProject(async (root) => {
    await writeFile(path.join(root, "package.json"), "{invalid");
    await writeFile(path.join(root, "tsconfig.json"), "{}\n");
    const detection = await detectProject(root);
    assert.deepEqual(detection.stacks.map((stack) => stack.id), ["javascript", "typescript"]);
    assert.deepEqual(detection.stacks.find((stack) => stack.id === "typescript")?.evidence, [
      { path: "tsconfig.json", reason: "存在 TypeScript 配置文件" },
    ]);
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

test("同一工程并发初始化只允许一个写入", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    const results = await Promise.allSettled([
      initializeProject(target, testAdapter, source),
      initializeProject(target, testAdapter, source),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
    await assert.rejects(readFile(path.join(target, ".agent-rules.operation.lock"), "utf8"), /ENOENT/);
  });
});

test("已有写入锁阻止预览和更新，且不会覆盖未知锁文件", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const config = await loadProjectConfig(target);
    const lockPath = path.join(target, ".agent-rules.operation.lock");
    await writeFile(lockPath, "外部写入操作");
    await assert.rejects(planProject(target, config, testAdapter), /写入操作锁/);
    await assert.rejects(applyProject(target, config, testAdapter), /已有规则写入操作锁/);
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "operation-in-progress"));
    assert.equal(await readFile(lockPath, "utf8"), "外部写入操作");
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

test("预览后规则源变化时拒绝应用未审查的差异", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const config = await loadProjectConfig(target);
    const sourceRule = path.join(source, "rulepacks", "common", "entry.md");
    const installedRule = path.join(target, ".agent-rules", "common", "entry.md");
    await writeFile(sourceRule, "# 已审查的规则\n");
    const reviewed = await planProject(target, config, testAdapter);
    assert.ok(reviewed.changes.some((change) => change.path === ".agent-rules/common/entry.md" && change.after === "# 已审查的规则\n"));
    await writeFile(sourceRule, "# 未审查的规则\n");
    await assert.rejects(applyProject(target, config, testAdapter, undefined, undefined, reviewed), /拒绝应用未经审查的差异/);
    assert.equal(await readFile(installedRule, "utf8"), "# common\n");
    const current = await planProject(target, config, testAdapter);
    await applyProject(target, config, testAdapter, undefined, undefined, current);
    assert.equal(await readFile(installedRule, "utf8"), "# 未审查的规则\n");
  });
});

test("并发应用同一份已审查差异不会重复写入", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    await writeFile(path.join(source, "rulepacks", "common", "entry.md"), "# 新规则\n");
    const config = await loadProjectConfig(target);
    const reviewed = await planProject(target, config, testAdapter);
    const results = await Promise.allSettled([
      applyProject(target, config, testAdapter, undefined, undefined, reviewed),
      applyProject(target, config, testAdapter, undefined, undefined, reviewed),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# 新规则\n");
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
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

test("受管目录被未知普通文件占用时初始化明确拒绝且保留原文件", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    const occupied = path.join(target, ".agent-rules");
    await writeFile(occupied, "项目原有文件\n");
    await assert.rejects(initializeProject(target, testAdapter, source), /invalid-managed-directory/);
    assert.equal(await readFile(occupied, "utf8"), "项目原有文件\n");
    await assert.rejects(readFile(path.join(target, "agent-rules.yaml"), "utf8"), /ENOENT/);
  });
});

test("本地规则源的畸形 manifest 在修改业务工程前被拒绝", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    await writePack(source, "common", "entry.md");
    const manifestPath = path.join(source, "rulepacks", "common", "pack.json");
    const base = JSON.parse(await readFile(manifestPath, "utf8"));
    const cases: Array<[string, object, RegExp]> = [
      ["missing-rules", { rules: null }, /manifest 字段/],
      ["unsafe-path", { rules: ["entry.md", "../outside.md"] }, /manifest 字段/],
      ["duplicate-rules", { rules: ["entry.md", "entry.md"] }, /manifest 字段/],
      ["missing-dependencies", { dependencies: null }, /manifest 字段/],
      ["schema-object", { $schema: { unexpected: true } }, /manifest 字段/],
      ["unknown-field", { installer: "run-me" }, /不支持的字段/],
    ];
    for (const [name, patch, error] of cases) {
      const target = path.join(root, name);
      await mkdir(target);
      const userFile = path.join(target, "keep.md");
      await writeFile(userFile, "业务文件\n");
      await writeFile(manifestPath, JSON.stringify({ ...base, ...patch }));
      await assert.rejects(initializeProject(target, testAdapter, source), error);
      assert.equal(await readFile(userFile, "utf8"), "业务文件\n");
      await assert.rejects(readFile(path.join(target, "agent-rules.yaml"), "utf8"), /ENOENT/);
      await assert.rejects(readFile(path.join(target, ".agent-rules.lock.json"), "utf8"), /ENOENT/);
    }
  });
});

test("本地规则源的内部符号链接不会被安装到业务工程", async (context) => {
  if (process.platform === "win32") context.skip("Windows 测试环境可能不允许创建符号链接");
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    const outside = path.join(root, "outside.md");
    await writeFile(outside, "项目外文件\n");
    const packDirectory = path.join(source, "rulepacks", "common");
    await symlink(outside, path.join(packDirectory, "linked.md"));
    const manifestPath = path.join(packDirectory, "pack.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.rules.push("linked.md");
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assert.rejects(initializeProject(target, testAdapter, source), /符号链接/);
    await assert.rejects(readFile(path.join(target, "agent-rules.yaml"), "utf8"), /ENOENT/);
    assert.equal(await readFile(outside, "utf8"), "项目外文件\n");
  });
});

test("校验不会把指向相同内容的符号链接当作完整安装", async (context) => {
  if (process.platform === "win32") context.skip("Windows 测试环境可能不允许创建符号链接");
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);

    const installed = path.join(target, ".agent-rules", "common", "entry.md");
    const outside = path.join(root, "outside.md");
    await writeFile(outside, await readFile(installed, "utf8"));
    await rm(installed);
    await symlink(outside, installed);
    const validation = await validateProject(target, testAdapter);
    assert.ok(validation.issues.some((issue) => issue.code === "symlink-path" && issue.message.includes("common/entry.md")));
    await rm(installed);
    await writeFile(installed, await readFile(outside, "utf8"));

    const override = path.join(target, ".agent-rules", "overrides.md");
    await rm(override);
    await symlink(outside, override);
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "symlink-path" && issue.message.includes("overrides.md")));
    assert.ok((await planProject(target, await loadProjectConfig(target), testAdapter)).conflicts.some((issue) => issue.code === "symlink-path" && issue.message.includes("overrides.md")));
    await rm(override);
    await writeFile(override, "# 项目覆盖规则\n");

    const entry = path.join(target, testAdapter.entryFile);
    await writeFile(outside, "SECRET_OUTSIDE_CONTENT\n");
    await rm(entry);
    await symlink(outside, entry);
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "symlink-path" && issue.message.includes(testAdapter.entryFile)));
    const preview = await planProject(target, await loadProjectConfig(target), testAdapter);
    assert.ok(preview.conflicts.some((issue) => issue.code === "symlink-path" && issue.message.includes(testAdapter.entryFile)));
    assert.ok(preview.changes.every((change) => !change.before?.includes("SECRET_OUTSIDE_CONTENT")));
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
    lock.managedFiles[".agent-rules/../important.md"] = `sha256:${"0".repeat(64)}`;
    await writeFile(lockPath, JSON.stringify(lock));
    const config = await loadProjectConfig(target);
    assert.ok((await planProject(target, config, testAdapter)).conflicts.some((issue) => issue.code === "unsafe-lock-path"));
    await assert.rejects(applyProject(target, config, testAdapter), /unsafe-lock-path/);
    assert.equal(await readFile(userFile, "utf8"), "用户文件\n");
  });
});

test("锁文件不能把项目覆盖规则或个人笔记冒充受管规则删除", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const overrides = path.join(target, ".agent-rules", "overrides.md");
    const notes = path.join(target, ".agent-rules", "common", "notes.md");
    await writeFile(overrides, "# 项目自己的规则\n");
    await writeFile(notes, "个人笔记\n");
    const lockPath = path.join(target, ".agent-rules.lock.json");
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    for (const [relative, content] of [
      [".agent-rules/overrides.md", "# 项目自己的规则\n"],
      [".agent-rules/common/notes.md", "个人笔记\n"],
    ] as const) {
      lock.managedFiles[relative] = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    }
    await writeFile(lockPath, JSON.stringify(lock));
    const config = await loadProjectConfig(target);
    const preview = await planProject(target, config, testAdapter);
    assert.ok(preview.conflicts.some((issue) => issue.code === "unexpected-managed-file"));
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "unexpected-managed-file"));
    await assert.rejects(applyProject(target, config, testAdapter), /unexpected-managed-file/);
    assert.equal(await readFile(overrides, "utf8"), "# 项目自己的规则\n");
    assert.equal(await readFile(notes, "utf8"), "个人笔记\n");
  });
});

test("损坏的锁文件不会进入更新，校验会返回明确问题", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const lockPath = path.join(target, ".agent-rules.lock.json");
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    lock.managedFiles = null;
    await writeFile(lockPath, JSON.stringify(lock));
    const config = await loadProjectConfig(target);
    await assert.rejects(planProject(target, config, testAdapter), /锁文件/);
    await assert.rejects(applyProject(target, config, testAdapter), /锁文件/);
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "invalid-lock"));
  });
});

test("配置移除规则包后校验会提示旧包仍安装，更新仍可安全移除", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await writePack(source, "go", "entry.md", ["common"]);
    await writePack(source, "project-docs/go", "entry.md", ["common"]);
    await writeFile(path.join(target, "go.mod"), "module demo\n");
    await initializeProject(target, testAdapter, source);
    const config = await loadProjectConfig(target);
    config.rulepacks = config.rulepacks.filter((id) => id !== "go");
    await writeFile(path.join(target, "agent-rules.yaml"), stringify(config));
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "unexpected-locked-pack" && issue.message.includes("go")));
    const preview = await planProject(target, config, testAdapter);
    assert.deepEqual(preview.conflicts, []);
    assert.ok(preview.changes.some((change) => change.path === ".agent-rules/go/entry.md" && change.action === "remove"));
    await applyProject(target, config, testAdapter);
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
  });
});

test("锁文件漏掉传递依赖时校验不会误报完整", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await writePack(source, "javascript", "entry.md", ["common"]);
    await writePack(source, "typescript", "entry.md", ["common", "javascript"]);
    await writePack(source, "project-docs/js-ts", "entry.md", ["common"]);
    await writeFile(path.join(target, "package.json"), JSON.stringify({ devDependencies: { typescript: "^5.0.0" } }));
    await initializeProject(target, testAdapter, source);
    const lockPath = path.join(target, ".agent-rules.lock.json");
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    delete lock.rulepacks.javascript;
    for (const relativePath of Object.keys(lock.managedFiles)) {
      if (relativePath.startsWith(".agent-rules/javascript/")) delete lock.managedFiles[relativePath];
    }
    await writeFile(lockPath, JSON.stringify(lock));
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "missing-locked-pack" && issue.message.includes("javascript")));
  });
});

test("损坏的项目配置会被清楚拒绝，不会覆盖已安装规则", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const installed = path.join(target, ".agent-rules", "common", "entry.md");
    const before = await readFile(installed, "utf8");
    await writeFile(path.join(target, "agent-rules.yaml"), "schemaVersion: 1\nupdates: null\n");
    await assert.rejects(loadProjectConfig(target), /更新策略/);
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "invalid-config"));
    assert.equal(await readFile(installed, "utf8"), before);
  });
});

test("首版明确拒绝旧字段、自动更新策略和未知配置项", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const valid = await loadProjectConfig(target);
    const configPath = path.join(target, "agent-rules.yaml");
    const installedPath = path.join(target, ".agent-rules", "common", "entry.md");
    const originalRule = await readFile(installedPath, "utf8");
    const cases: Array<[object, RegExp]> = [
      [{ ...valid, source: { registry: "github", repository: "owner/repo" } }, /规则源/],
      [{ ...valid, updates: { channel: "stable", strategy: "pull-request" } }, /人工批准更新/],
      [{ ...valid, updates: { channel: "stable", strategy: "manual", automatic: true } }, /不支持的字段.*automatic/],
      [{ ...valid, source: { type: "workspace", path: ".", repository: "owner/repo" } }, /不支持的字段.*repository/],
      [{ ...valid, telemetry: true }, /不支持的字段.*telemetry/],
      [{ ...valid, $schema: { unexpected: true } }, /schema 版本或声明不合法/],
    ];
    for (const [config, error] of cases) {
      await writeFile(configPath, stringify(config));
      await assert.rejects(loadProjectConfig(target), error);
      assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "invalid-config"));
      assert.equal(await readFile(installedPath, "utf8"), originalRule);
    }
    await assert.rejects(planProject(target, { ...valid, schemaVersion: 2 as 1 }, testAdapter), /schema 版本/);
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

test("项目覆盖规则被同名目录占用时校验、预览与更新都拒绝", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const override = path.join(target, ".agent-rules", "overrides.md");
    await rm(override);
    await mkdir(override);
    const config = await loadProjectConfig(target);
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "invalid-overrides-type"));
    assert.ok((await planProject(target, config, testAdapter)).conflicts.some((issue) => issue.code === "invalid-overrides-type"));
    await assert.rejects(applyProject(target, config, testAdapter), /invalid-overrides-type/);
    assert.ok((await lstat(override)).isDirectory());
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

test("校验不存在的工程仍报告缺失文件", async () => {
  await withTempProject(async (root) => {
    const validation = await validateProject(path.join(root, "missing-project"), testAdapter);
    assert.ok(validation.issues.some((issue) => issue.code === "missing-file"));
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
    assert.ok((await validateProject(target, testAdapter)).issues.some((issue) => issue.code === "interrupted-transaction"));
    await assert.rejects(planProject(target, await loadProjectConfig(target), testAdapter), /未完成的规则更新事务/);
    const operationLock = path.join(target, ".agent-rules.operation.lock");
    await writeFile(operationLock, "另一个操作");
    await assert.rejects(recoverInterruptedProject(target, testAdapter), /已有规则写入操作锁/);
    assert.equal((await listInterruptedTransactions(target)).length, 1);
    await rm(operationLock);
    const recoveryCopy = await recoverInterruptedProject(target, testAdapter);
    assert.ok(recoveryCopy?.includes(".agent-rules.recovered-"));
    assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# common\n");
    assert.deepEqual(await listInterruptedTransactions(target), []);
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
  });
});

test("恢复再次中断后重试不会覆盖已保留的控制文件副本", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);

    const entry = path.join(target, testAdapter.entryFile);
    const lock = path.join(target, ".agent-rules.lock.json");
    const oldEntry = await readFile(entry, "utf8");
    const oldLock = await readFile(lock, "utf8");
    const transaction = path.join(target, ".agent-rules.transaction-retry");
    const savedControls = path.join(transaction, "incomplete-controls");
    await mkdir(savedControls, { recursive: true });
    await writeFile(path.join(transaction, "journal.json"), JSON.stringify({
      schemaVersion: 1,
      hadRules: true,
      snapshots: { [testAdapter.entryFile]: oldEntry, ".agent-rules.lock.json": oldLock },
    }));
    await writeFile(path.join(savedControls, testAdapter.entryFile), "第一次恢复保存的未完成入口\n");
    await writeFile(lock, "未完成的新锁文件\n");

    const recovered = await recoverInterruptedProject(target, testAdapter);
    assert.ok(recovered);
    assert.equal(await readFile(path.join(recovered, "incomplete-controls", testAdapter.entryFile), "utf8"), "第一次恢复保存的未完成入口\n");
    assert.equal(await readFile(path.join(recovered, "incomplete-controls", ".agent-rules.lock.json"), "utf8"), "未完成的新锁文件\n");
    assert.equal(await readFile(entry, "utf8"), oldEntry);
    assert.equal(await readFile(lock, "utf8"), oldLock);
    assert.deepEqual(await validateProject(target, testAdapter), { valid: true, issues: [] });
  });
});

test("损坏的恢复记录在移动规则目录前被拒绝", async () => {
  await withTempProject(async (root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(target);
    await writePack(source, "common", "entry.md");
    await initializeProject(target, testAdapter, source);
    const transaction = path.join(target, ".agent-rules.transaction-invalid");
    await mkdir(transaction);
    const originalRule = await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8");
    for (const snapshots of [[], { [testAdapter.entryFile]: "入口" }, { [testAdapter.entryFile]: 123, ".agent-rules.lock.json": null }]) {
      await writeFile(path.join(transaction, "journal.json"), JSON.stringify({ schemaVersion: 1, hadRules: true, snapshots }));
      await assert.rejects(recoverInterruptedProject(target, testAdapter), /恢复记录/);
      assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), originalRule);
      await assert.rejects(readFile(path.join(target, ".agent-rules.operation.lock"), "utf8"), /ENOENT/);
    }
  });
});
