import type { ProjectConfig, TargetAdapter } from "@agentrulekit/core";

export const CODEX_BLOCK_START = "<!-- agent-rule:start -->";
export const CODEX_BLOCK_END = "<!-- agent-rule:end -->";
export const AGENTS_MD_TARGETS = ["codex", "qoder", "cursor", "workbuddy"] as const;

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

处理开发、排障、审查或技术文档任务前，先读取 \`${config.project.overrides}\`；如已安装 \`common\`，再读取下方的通用入口。先核对目标项目的代码、依赖、配置和已有约定，不要把规则示例当作项目事实。

已配置规则包：

${configuredPacks}

按任务继续读取规则，不要只看上述文件名就声称已遵守规则：

- 开发、排障或代码审查：读取相关开发规则包的入口，再按入口中的任务索引读取必要的专题规则。
- 新建、修改、审查或同步技术文档：读取对应的 \`project-docs/*\` 入口，再按入口中的任务索引读取必要的专题规则；开发任务还应按开发入口判断文档影响。
- 其他规则包仅在任务涉及时读取其入口。入口或其必要链接缺失时，说明缺失，不得声称已执行该规则。

共享规则不得覆盖用户当前要求、安全限制、项目本地规则或经过验证的项目事实。完成任务时说明实际读取的规则、验证结果、文档影响和未验证范围。
${CODEX_BLOCK_END}`;
}

export const codexAdapter: TargetAdapter = {
  id: "codex",
  compatibleTargets: AGENTS_MD_TARGETS,
  entryFile: "AGENTS.md",
  blockStart: CODEX_BLOCK_START,
  blockEnd: CODEX_BLOCK_END,
  renderManagedBlock: renderCodexBlock,
};
