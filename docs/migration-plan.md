 # 规则迁移记录

## 当前状态

2026-08-17 已完成以下源目录的复制迁移，并在迁移核对后移入 `archive/legacy-rules/`：

- `archive/legacy-rules/AIcoding项目开发规范/`
- `archive/legacy-rules/AIcoding项目文档编写规范/`

迁移结果：

- 14 个可安装规则包，包含 116 份规则正文。
- 10 份 Codex 入口模板。
- 10 份 TRAE 手动使用指南。
- 10 份 Qoder 入口模板，暂供后续适配器实现使用。
- 规则包内部路径已改为安装后的 `.agent-rules/` 布局。

归档目录保留原始副本，不参与 CLI 安装；正式规则只在 `rulepacks/` 中维护。

## 后续同步流程

源目录若仍产生需要纳入 AgentRuleKit 的改动，应按规则包逐项同步：

1. 选择一个源技术栈。
2. 将已经完成的内容复制到匹配的 `rulepacks/` 目录。
3. 创建或更新 `pack.json`，填写真实入口和有序规则清单。
4. 按安装后的规则包布局改写内部链接。
5. 运行源规则检查和 AgentRuleKit Schema 检查。
6. 为初始化和 Codex 路由增加 fixture 覆盖。
7. 只有端到端验证通过后，才能保留规则包的 `ready` 状态。

正式迁移完成后，规则正文以 `rulepacks/` 为权威维护位置。适配器只保留薄入口或使用指南，不复制规则正文。
