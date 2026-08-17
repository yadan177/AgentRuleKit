# AgentRuleKit

AgentRuleKit 是面向 AI 编程代理的平台无关工程规则与工作流分发系统。Codex 是第一个实现的适配器；Cursor、TRAE、Qoder 等工具后续通过相同的适配器边界接入。

## 当前状态

`0.1.0` 是可运行的基础版本，当前包含：

- 基于证据检测技术栈的 TypeScript 核心包。
- 支持 `detect`、`init`、`generate`、`check` 和 `validate` 的 `agent-rule` CLI。
- 管理 `AGENTS.md` 受控区块的 Codex 适配器。
- 包含四个初始 Skills 的 Codex 插件。
- 规则包、项目配置、锁文件和适配器 Schema。
- 已迁移的 14 个规则包，共 116 份开发与技术文档规则。
- Codex 入口模板、TRAE 手动指南和 Qoder 入口模板归档。
- 将规则真实安装到业务工程并检测受管文件漂移的本地工作区流程。

远程规则下载、远程版本更新和非 Codex 自动生成器尚未实现。

## 迁移状态

迁移前的两个源目录已经移入 `archive/legacy-rules/`，仅用于历史查阅和差异追溯，不参与安装，也不作为权威规则源。

迁移结果和后续维护约束见 [docs/migration-plan.md](docs/migration-plan.md)。

## 本地开发

环境要求：Node.js 20 或更高版本，以及 npm。

```bash
npm install
npm run check
node packages/cli/dist/index.js detect .
```

初始化一个临时或外部测试工程：

```bash
node packages/cli/dist/index.js init /absolute/path/to/project
node packages/cli/dist/index.js validate /absolute/path/to/project
```

在没有审查受管文件范围前，不要对已有业务工程直接运行 `init`。

## 仓库结构

```text
packages/core/             平台无关核心逻辑
packages/cli/              agent-rule 命令行工具
adapters/codex/            首个目标适配器
plugins/agent-rule-kit/    Codex 插件与 Skills
rulepacks/                 权威规则包目标目录
schemas/                   版本化数据契约
templates/                 项目生成模板
docs/                      架构与迁移说明
examples/                  示例项目配置
```

完整产品方向和验收标准见 [AgentRuleKit产品设计与实施方案.md](AgentRuleKit产品设计与实施方案.md)。
