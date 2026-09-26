# AgentRuleKit 仓库开发规则

## 当前边界

- 迁移前的规则目录已从当前工作树清理；历史内容仅从 Git 历史查阅，不得当作当前规则源直接安装。
- 规则正文只从 `rulepacks/` 读取和维护；适配器入口只从 `adapters/` 读取和维护。
- 新产品代码放在 `packages/`、`adapters/`、`plugins/`、`rulepacks/`、`workflows/`、`schemas/` 和 `docs/`。

## 产品方向

- Codex 是第一个实现的适配器，但核心必须保持平台无关。
- 规则正文只在 `rulepacks/` 维护；适配器和 Skills 必须引用该来源或由其生成。
- 项目事实与项目本地覆盖规则的优先级高于共享规则。
- 不得静默覆盖未知项目文件，也不得在没有可审查差异的情况下更新规则。

## 验证

运行 `npm run check` 完成 TypeScript 构建与测试。发布前使用官方校验器验证 Codex Skills 和插件。
