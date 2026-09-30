import assert from "node:assert/strict";
import test from "node:test";

import { mergeManagedBlock } from "@agentrulekit/core";
import type { ProjectConfig } from "@agentrulekit/core";

import { CODEX_BLOCK_END, CODEX_BLOCK_START, codexAdapter } from "./index.js";

const config: ProjectConfig = {
  schemaVersion: 1,
  source: { type: "workspace", path: "." },
  rulepacks: ["common", "go", "project-docs/go"],
  targets: ["codex"],
  project: { overrides: ".agent-rules/overrides.md" },
  updates: { channel: "stable", strategy: "manual" },
};

test("Codex 适配器生成 AGENTS.md 入口并保留非受管内容", () => {
  const block = codexAdapter.renderManagedBlock(config, {
    common: "entry.md",
    go: "入口.md",
    "project-docs/go": "文档入口.md",
  });
  assert.ok(block.startsWith(CODEX_BLOCK_START));
  assert.ok(block.endsWith(CODEX_BLOCK_END));
  assert.match(block, /\.agent-rules\/overrides\.md/);
  assert.match(block, /如已安装 `common`，再读取下方的通用入口/);
  assert.match(block, /\.agent-rules\/common\/entry\.md/);
  assert.match(block, /\.agent-rules\/go\/入口\.md/);
  assert.match(block, /\.agent-rules\/project-docs\/go\/文档入口\.md/);
  assert.match(block, /开发、排障或代码审查：读取相关开发规则包的入口/);
  assert.match(block, /新建、修改、审查或同步技术文档：读取对应的 `project-docs\/\*` 入口/);
  assert.match(block, /入口或其必要链接缺失时，说明缺失/);
  assert.match(block, /完成任务时说明实际读取的规则、验证结果、文档影响和未验证范围/);
  const merged = mergeManagedBlock("# 用户规则\n", block, codexAdapter);
  assert.match(merged, /^# 用户规则\n/);
  assert.equal(mergeManagedBlock(merged, block, codexAdapter), merged);
});

test("Codex 适配器拒绝不完整的旧受控区块", () => {
  const block = codexAdapter.renderManagedBlock(config, {});
  assert.throws(() => mergeManagedBlock(`${CODEX_BLOCK_START}\n旧内容`, block, codexAdapter), /边界不完整/);
  assert.throws(() => mergeManagedBlock(`${block}\n${block}`, block, codexAdapter), /边界不完整/);
});
