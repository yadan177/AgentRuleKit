---
name: rules-update
description: 检查工程中已安装 AgentRuleKit 文件的完整性和更新准备状态，保留本地覆盖规则并在变更前要求审查。用户要求检查、预览、应用、排查或验证 AgentRuleKit 规则更新时使用。
---

# 规则更新

规则更新由用户决定是否应用。自动检查只负责提醒，不得代替用户批准。

## 执行流程

1. 在目标工程中定位 `agent-rules.yaml` 和 `.agent-rules.lock.json`。
2. 运行 `agent-rule validate <project-root>` 检查本地完整性；失败时先报告漂移或缺失，不得覆盖。
3. 运行 `agent-rule check <project-root>` 检查规则源版本。网络失败时报告未知，不得说已是最新。
4. 运行 `agent-rule diff <project-root>`，向用户说明版本、改动文件和重要差异。冲突时停止。
5. 只有用户明确同意应用此次更新，才运行 `agent-rule update <project-root> --apply`。
6. 应用后运行 `agent-rule validate <project-root>`，报告结果和未解决问题。

`.agent-rules/overrides.md`、未知文件与 `AGENTS.md` 受控区块外的内容应始终保留。`check` 返回码 3 表示存在待更新版本或文件，不代表命令失败。
