# Codex 适配器

Codex 规则入口适配器管理目标工程 `AGENTS.md` 中带边界标记的受控区块。AI 开发工具箱本身独立运行，不安装进 Codex。过去用于规则管理的 `agent-rule-kit` Codex 插件包已退役；未来真正的开发 Skill 或能力插件需按独立资产交付。定位与资产划分见[产品定位与架构](../../docs/product-architecture.md)。

`src/index.ts` 提供共享 `AGENTS.md` 的 `TargetAdapter` 实现：入口文件、区块边界、入口渲染及兼容平台列表。Codex、Qoder、Cursor、WorkBuddy 使用同一入口；核心层不保存任何平台专用规则正文。

适配器必须保留 AgentRuleKit 受控区块之外的全部内容。当前与 Qoder、Cursor、WorkBuddy 共用 `AGENTS.md` 入口，后三者的真实客户端加载仍待验收；未来通用 Skill 和能力插件需要另一类面向 IDE 个人环境的交付适配，分别验证依赖、范围和生效结果。

`templates/` 保存各技术栈迁移后的详细 Codex 入口模板。当前 CLI 使用统一受控区块并依据 pack manifest 生成入口；这些模板用于后续增强路由内容和回归核对，不直接覆盖业务工程的 `AGENTS.md`。
