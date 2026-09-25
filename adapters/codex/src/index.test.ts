import assert from "node:assert/strict";
import test from "node:test";

import { mergeManagedBlock } from "@agentrulekit/core";
import type { ProjectConfig } from "@agentrulekit/core";

import { CODEX_BLOCK_END, CODEX_BLOCK_START, codexAdapter } from "./index.js";

const config: ProjectConfig = {
  schemaVersion: 1,
  source: { type: "workspace", path: "." },
  rulepacks: ["common", "go"],
  targets: ["codex"],
  project: { overrides: ".agent-rules/overrides.md" },
  updates: { channel: "stable", strategy: "manual" },
};

test("Codex 适配器生成 AGENTS.md 入口并保留非受管内容", () => {
  const block = codexAdapter.renderManagedBlock(config, { common: "entry.md", go: "入口.md" });
  assert.ok(block.startsWith(CODEX_BLOCK_START));
  assert.ok(block.endsWith(CODEX_BLOCK_END));
  assert.match(block, /\.agent-rules\/overrides\.md/);
  assert.match(block, /\.agent-rules\/go\/入口\.md/);
  const merged = mergeManagedBlock("# 用户规则\n", block, codexAdapter);
  assert.match(merged, /^# 用户规则\n/);
  assert.equal(mergeManagedBlock(merged, block, codexAdapter), merged);
});

test("Codex 适配器拒绝不完整的旧受控区块", () => {
  const block = codexAdapter.renderManagedBlock(config, {});
  assert.throws(() => mergeManagedBlock(`${CODEX_BLOCK_START}\n旧内容`, block, codexAdapter), /边界不完整/);
  assert.throws(() => mergeManagedBlock(`${block}\n${block}`, block, codexAdapter), /边界不完整/);
});
