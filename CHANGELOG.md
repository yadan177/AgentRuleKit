# 变更记录

## 0.1.1 - 2026-09-25

- 在通用入口规则中明确：更新共享规则必须先审查差异，并由用户决定是否应用。
- npm 包新增中文包级 README；CLI 命令入口和注册表独立安装纳入自动测试。
- 为 npm 发布工作流配置 GitHub Actions Trusted Publisher，并固定兼容的 npm CLI 版本；实际 OIDC 发布将在此版本验收。
- 增加真实 GitHub Release 和 npm 包的独立安装验收脚本。

## 0.1.0 - 2026-09-25

- 初始化 TypeScript workspace 和 `agent-rule` CLI。
- 增加平台无关的项目检测与受管文件生成能力。
- 增加 Codex 适配器和 AgentRuleKit 插件骨架。
- 增加初始化、审查、文档影响和更新准备 Skills。
- 增加 Schemas、示例和 CI 骨架。
- 迁移 14 个规则包，共 116 份开发与技术文档规则。
- 归档 Codex、TRAE、Qoder 的 30 份适配器入口资料。
- 支持将本地工作区规则安装到 `.agent-rules/`，记录文件摘要并检测漂移。
- 增加规则包清单、依赖和本地链接 CI 校验，并在 Release 产物中记录可核查的 Git 来源提交。
- 首次发布 GitHub Release 与公开 npm 包 `agentrulekit@0.1.0`。
