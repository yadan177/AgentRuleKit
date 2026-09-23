import type { ProjectConfig } from "./types.js";

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

export function mergeManagedBlock(existing: string, block: string): string {
  const start = existing.indexOf(CODEX_BLOCK_START);
  const end = existing.indexOf(CODEX_BLOCK_END);

  if ((start === -1) !== (end === -1)) {
    throw new Error("AGENTS.md 包含边界不完整的 AgentRuleKit 受控区块");
  }

  if (start !== -1 && end !== -1) {
    const endOffset = end + CODEX_BLOCK_END.length;
    return `${existing.slice(0, start)}${block}${existing.slice(endOffset)}`;
  }

  const prefix = existing.trimEnd();
  return prefix ? `${prefix}\n\n${block}\n` : `${block}\n`;
}
