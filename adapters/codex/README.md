# Codex 适配器

Codex 适配器是 AgentRuleKit 第一个实现的目标。它管理目标工程 `AGENTS.md` 中带边界标记的受控区块，并通过 `plugins/agent-rule-kit` 打包可复用工作流。

`src/index.ts` 提供核心层的 `TargetAdapter` 实现：目标 ID、入口文件、区块边界及入口渲染。核心层不包含 Codex 专用路径和文案；CLI 当前只装配这一适配器。

适配器必须保留 AgentRuleKit 受控区块之外的全部内容。插件安装与项目规则安装属于两个独立生命周期。

`templates/` 保存各技术栈迁移后的详细 Codex 入口模板。当前 CLI 使用统一受控区块并依据 pack manifest 生成入口；这些模板用于后续增强路由内容和回归核对，不直接覆盖业务工程的 `AGENTS.md`。
