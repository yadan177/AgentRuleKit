import type { ProjectConfig, TargetAdapter } from "@agentrulekit/core";

export const CODEX_BLOCK_START = "<!-- agent-rule:start -->";
export const CODEX_BLOCK_END = "<!-- agent-rule:end -->";

export function renderCodexBlock(
  config: ProjectConfig,
  entries: Record<string, string> = {},
): string {
  const packs = Object.entries(entries)
    .map(([pack, entry]) => `- \`${pack}\`：\`.agent-rules/${pack}/${entry}\``)
    .join("\n");
  const configuredPacks = packs || config.rulepacks.map((pack) => `- \`${pack}\``).join("\n");

  return `${CODEX_BLOCK_START}
## AgentRuleKit

修改工程前，先读取 \`${config.project.overrides}\`，再读取与当前任务相关的已安装规则包。

已配置规则包：

${configuredPacks}

共享规则不得覆盖用户当前要求、安全限制或经过验证的项目事实。
${CODEX_BLOCK_END}`;
}

export const codexAdapter: TargetAdapter = {
  id: "codex",
  entryFile: "AGENTS.md",
  blockStart: CODEX_BLOCK_START,
  blockEnd: CODEX_BLOCK_END,
  renderManagedBlock: renderCodexBlock,
};
