# 07 - TypeScript lint 与格式化集成规则

> 🟢 本文件适用于项目已配置的 TypeScript lint、格式化、EditorConfig、hook 与 CI 质量检查。
>
> 🔴 不适用：未经授权引入 ESLint、Prettier、Biome、类型化 lint、插件、flat config 或修改 CI 门槛。

---

## 1. 工具链事实优先

> **适用条件与验证**：先检查 `package.json`、锁文件、ESLint 配置形式、Prettier/其他 formatter、tsconfig、IDE 设置、hook、CI 与现有 scripts。

🔴 **必须**：不得因规则示例安装插件、使用浮动版本、迁移配置格式、开启类型化规则或批量修复全仓文件。不得把未运行的 lint/format/typecheck 称为通过。

## 2. 规则与性能边界

> **适用条件与验证**：类型化 lint 的可用性与性能取决于 TypeScript 版本、tsconfig、项目规模、CI 时限和现有配置。

🔴 **必须**：不得为消除告警关闭安全/正确性规则、用大量禁用注释掩盖问题，或让 lint 配置与实际 TypeScript/构建配置脱节。

🟡 **推荐**：项目已采用 formatter 时由它管理格式；lint 关注项目已选择的正确性与可维护性规则。存量告警与本次改动造成的告警分开处理。

## 3. AI 完成检查

- [ ] 已确认仓库实际使用的 lint、formatter、tsconfig、hook 和 CI 命令。
- [ ] 未新增/升级工具、插件或配置格式来处理局部需求。
- [ ] 仅对相关范围执行已有检查，或如实说明无法执行的原因。
- [ ] 未产生无关全仓格式化和自动修复 diff。
