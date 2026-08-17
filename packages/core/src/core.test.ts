import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CODEX_BLOCK_START,
  detectProject,
  initializeProject,
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
    assert.deepEqual(await validateProject(target), { valid: true, issues: [] });
  });
});
