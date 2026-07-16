# JavaScript / TypeScript 项目规则入口

先阅读 `.ai-rules/js/15-AI通用入口规则.md`，再按 `.ai-rules/js/00-文档总览.md` 选择当前任务相关专题规则。

若项目使用 TypeScript，额外阅读 `.ai-rules/ts/09-AI通用入口规则.md` 和 TS 总览；TS 规则不能替代 JS 运行时与安全规则。

- 以 `package.json`、锁文件、`tsconfig*.json`、已有代码和 CI 为事实来源；不要把规则示例当成升级或迁移指令。
- 未获授权不得新增依赖、替换框架/构建工具/样式方案，或重构无关模块。
- 完成后运行与改动相称的现有验证；不能运行时说明原因、范围和风险。
