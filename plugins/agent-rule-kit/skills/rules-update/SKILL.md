---
name: rules-update
description: 检查工程中已安装 AgentRuleKit 文件的完整性和更新准备状态，保留本地覆盖规则并在变更前要求审查。用户要求检查、预览、应用、排查或验证 AgentRuleKit 规则更新时使用。
---

# 规则更新

只使用当前 CLI 已支持的能力，不得模拟当前版本无法执行的远程规则更新。

## 执行流程

1. 在目标工程中定位 `agent-rules.yaml` 和 `.agent-rules.lock.json`。
2. 运行 `agent-rule check <project-root>`，优先报告缺失文件或受控区块损坏。
3. 调用更新命令前检查已安装 CLI 的帮助信息。
4. 若当前版本支持 `diff` 和 `update`，应用更新前必须先预览差异。
5. 保留 `.agent-rules/overrides.md` 和受控区块之外的全部内容。
6. 执行任何受支持的重新生成或更新后，运行 `agent-rule validate <project-root>`。
7. 报告旧版本、新版本、变更文件、验证结果和未解决冲突。

## 当前基础版本限制

`0.1.0` 支持从配置中的本地工作区规则源重新生成、校验完整性并检测文件漂移，但不支持远程规则注册表同步。使用远程来源时应在验证后停止，并明确报告当前限制。
