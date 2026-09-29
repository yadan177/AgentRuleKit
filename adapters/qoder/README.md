# Qoder 项目规则入口

Qoder 官方支持自动读取项目根目录的 `AGENTS.md`。安装时选择 Qoder，会将 Qoder 记入项目配置和锁文件，并在共享的 `AGENTS.md` 受控区块中指向 `.agent-rules/` 规则包。不生成第二份规则正文。

`templates/` 是迁移时保留的参考入口，不参与安装。若项目另有 `.qoder/rules/`，Qoder 官方说明该目录的规则与 `AGENTS.md` 冲突时优先；AgentRuleKit 不改动这些现有规则。

依据：[Qoder 官方规则文档](https://docs.qoder.com/user-guide/rules)。
