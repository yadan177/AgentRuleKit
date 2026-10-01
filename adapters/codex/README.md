# Codex 适配器

Codex 适配器是独立 AI 开发工具箱的首个实现目标。它管理目标工程 `AGENTS.md` 中带边界标记的受控区块，并通过 `plugins/agent-rule-kit` 打包当前四个规则管理操作流程 Skill。这个 Codex 插件包只是 IDE 交付形式，不是整款工具箱，也不是规划中的场景能力插件库；定位与资产划分见[产品定位与架构](../../docs/product-architecture.md)。

`src/index.ts` 提供共享 `AGENTS.md` 的 `TargetAdapter` 实现：入口文件、区块边界、入口渲染及兼容平台列表。Codex、Qoder、Cursor、WorkBuddy 使用同一入口；核心层不保存任何平台专用规则正文。

适配器必须保留 AgentRuleKit 受控区块之外的全部内容。Codex 插件安装与各项目规则安装属于独立生命周期。当前与 Qoder、Cursor、WorkBuddy 共用 `AGENTS.md` 入口，后三者的真实客户端加载仍待验收；未来场景插件中的 Skills、工具及规则入口须按各宿主支持的形式交付，并分别验证依赖、范围和生效结果。

`templates/` 保存各技术栈迁移后的详细 Codex 入口模板。当前 CLI 使用统一受控区块并依据 pack manifest 生成入口；这些模板用于后续增强路由内容和回归核对，不直接覆盖业务工程的 `AGENTS.md`。
