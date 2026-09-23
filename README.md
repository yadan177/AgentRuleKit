# AgentRuleKit（AI开发工具箱）

AgentRuleKit 是面向 AI 编程代理的平台无关工程规则与工作流分发系统。Codex 是第一个实现的适配器；Cursor、TRAE、Qoder 等工具后续通过相同的适配器边界接入。

## 当前状态

`0.1.0` 正在完成首个公开版本，当前代码包含：

- 基于证据检测技术栈的 TypeScript 核心包。
- 支持 `detect`、`init`、`validate`、`check`、`diff` 和 `update` 的 `agent-rule` CLI。
- 管理 `AGENTS.md` 受控区块的 Codex 适配器。
- 包含四个初始 Skills 的 Codex 插件。
- 规则包、项目配置、锁文件和适配器 Schema。
- 已迁移的 14 个规则包，共 116 份开发与技术文档规则。
- Codex 入口模板、TRAE 手动指南和 Qoder 入口模板归档。
- 将规则真实安装到业务工程，预览差异后再应用更新；发生受管文件漂移或未知文件碰撞时拒绝覆盖。
- GitHub Release 规则包下载与 SHA-256 验证、Codex 会话开始时每天至多一次的后台更新检查。
- 独立 npm CLI 构建、仓库插件市场入口和跨平台 CI 配置。

公开仓库、GitHub Release 和 npm 首次发布尚未完成，因此外部用户暂时不能执行默认的远程 `init`。非 Codex 自动生成器尚未实现。

## 业务项目如何使用

公开发布完成后，在个人电脑安装 CLI；Codex 插件可另行安装到个人 Codex 环境。规则本身安装在每个业务项目的 `.agent-rules/` 中并提交 Git：

```bash
npm install -g agentrulekit
agent-rule detect /absolute/path/to/project
agent-rule init /absolute/path/to/project
agent-rule validate /absolute/path/to/project
```

`init` 只在没有 `agent-rules.yaml` 的项目执行。它检测技术栈，从官方 GitHub Release 下载并校验规则包；已有 `AGENTS.md` 的非受管内容会保留。完整步骤见 [安装与更新](docs/installation.md)。

更新分成三步：`check` 发现新版本，`diff` 让人审查，`update --apply` 才修改项目文件。自动检查仅提醒，不会自动应用。项目本地覆盖规则和未知文件受保护。

## 迁移状态

迁移前的两个源目录已经移入 `archive/legacy-rules/`，仅用于历史查阅和差异追溯，不参与安装，也不作为权威规则源。

迁移结果和后续维护约束见 [docs/migration-plan.md](docs/migration-plan.md)。

## 本地开发

环境要求：Node.js 22 或更高版本，以及 npm。

```bash
npm install
npm run check
node packages/cli/dist/index.js detect .
```

初始化一个临时或外部测试工程：

```bash
node packages/cli/dist/index.js init /absolute/path/to/project --source-workspace /absolute/path/to/AgentRuleKit
node packages/cli/dist/index.js validate /absolute/path/to/project
```

首版阶段和验收标准见 [开发与跑通计划](docs/development-plan.md)；发布流程和仍需完成的外部前提见 [发布说明](docs/releasing.md)。在没有审查受管文件范围前，不要对已有业务工程直接运行 `init`。

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
