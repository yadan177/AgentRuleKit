# Qoder 适配器

Qoder 适配器尚未正式实现。`templates/` 保存从现有规则库迁移的项目规则入口，作为后续实现 `.qoder/rules/` 生成器和兼容性测试的输入资料。

这些模板已改为 AgentRuleKit 的 `.agent-rules/` 安装路径，但在生成器和目标版本验证完成前，不会由 CLI 自动写入业务工程，也不代表当前 Qoder 版本一定会自动加载。
