# AI 开发工具箱（AgentRuleKit）

AI 开发工具箱定位为独立于任何 AI 编程 IDE 的多项目产品：由桌面应用和 CLI 管理项目中的规则，并逐步扩展为规则、Skills、能力插件的统一管理入口。产品方向是以产品规划、UI 设计、前端、后端、Unity 等场景插件为主要使用入口，再由 IDE 适配器交付。Codex 是首个实现的目标；在 Codex 中安装的插件包不是整款工具箱。桌面版目前也可为 Qoder、Cursor、WorkBuddy 生成共享的 `AGENTS.md` 项目入口，实际客户端加载仍待验收。

## 产品结构

- **规则**定义企业和项目应遵守的要求；通用基线、企业规则和项目覆盖需要可审查地组合。
- **Skills**定义完成一类任务的流程；通用流程应读取当前项目生效的规则，不复制规则正文。
- **能力插件**是用户主要选择的场景能力，可组合多个 Skills、工具连接和交接产物；不同企业和项目的配置、权限仍需分别管理。
- **IDE 适配器**负责交付到各工具。当前 Codex 插件是 IDE 安装包，不等于已经建成能力插件库。

工具箱将按项目组合所选能力；规则、Skills 和能力插件在来源与生命周期上解耦，在目标 IDE 中按需打包。项目级安装与个人 IDE 环境安装分别记录，不把同一套规则强制应用到所有项目。完整定位、架构、安装范围和当前实现边界见[产品定位与架构](docs/product-architecture.md)。

## 当前状态

CLI 和规则包的最新正式版本为 `0.1.5`；桌面应用的最新正式版本为 `1.1.0`。当前代码包含：

- 基于证据检测技术栈的 TypeScript 核心包。
- 支持 `detect`、`init`、`validate`、`check`、`diff`、`update` 和 `uninstall` 的 `agent-rule` CLI。
- 管理共享 `AGENTS.md` 受控区块的 Codex、Qoder、Cursor 和 WorkBuddy 项目入口（后面三项仍待真实客户端验收）。
- 包含四个规则管理操作流程 Skill 的 Codex 插件包；独立的开发 Skill 库与能力插件库尚未实现。
- 规则包、项目配置、锁文件和适配器 Schema。
- 已迁移的 14 个规则包，共 116 份开发与技术文档规则。
- 在 `adapters/` 维护平台入口资料；规则正文仍只在 `rulepacks/`。
- 将规则真实安装到业务工程，预览差异后再应用更新；发生受管文件漂移或未知文件碰撞时拒绝覆盖。
- GitHub Release 规则包下载与 SHA-256 验证、Codex 会话开始时每天至多一次的后台更新检查。
- 独立 npm CLI 构建、仓库插件市场入口和跨平台 CI 配置。
- macOS Apple Silicon 与 Windows x64 桌面安装包，可选择项目、技术栈和目标平台，预览后安装、更新或卸载规则；Windows 安装包已由 CI 构建，真实桌面交互仍待验收。

目前桌面版每次选择一个项目来管理规则，尚无统一项目列表、资产组合管理、独立开发 Skill 库和场景能力插件库。现有 Codex 插件包提供规则管理对话入口与更新提醒，不能替代桌面版、CLI 或业务项目中安装的规则。

GitHub 仓库已公开；[桌面版 `1.1.0`](https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.1.0)、[`v0.1.5` 规则包 Release](https://github.com/yadan177/AgentRuleKit/releases/tag/v0.1.5) 和 [npm CLI `agentrulekit@0.1.5`](https://www.npmjs.com/package/agentrulekit) 已分别发布。Go、TypeScript、Unity 临时工程已从正式 npm 包通过公开规则包的同版本验收。已发布的 CLI 不支持多平台配置；Qoder、Cursor、WorkBuddy 的实际客户端加载，以及 Codex 桌面端插件交互与 Hook 调度仍待验收。

## 业务项目如何使用

在个人电脑安装 CLI；Codex 插件可另行安装到个人 Codex 环境。规则本身安装在每个业务项目的 `.agent-rules/` 中并提交 Git：

```bash
npm install -g agentrulekit
agent-rule detect /absolute/path/to/project
agent-rule init /absolute/path/to/project
agent-rule validate /absolute/path/to/project
```

`init` 只在没有 `agent-rules.yaml` 的项目执行。它检测技术栈，从官方 GitHub Release 下载并校验规则包；已有 `AGENTS.md` 的非受管内容会保留。完整步骤见 [安装与更新](docs/installation.md)。

桌面版 `1.1.0` 可多选 Codex、Qoder、Cursor、WorkBuddy。四个平台共用项目中的一套规则和一个 `AGENTS.md` 入口，选择记录在配置与锁文件中。仓库源码中的 CLI 可用 `--targets codex,qoder,cursor,workbuddy` 指定；此能力尚未发布到 npm，正式 CLI `0.1.5` 不能管理桌面版创建的多平台配置。

更新分成三步：`check` 发现新版本，`diff` 让人审查，`update --apply` 才修改项目文件。自动检查仅提醒，不会自动应用。项目本地覆盖规则和未知文件受保护。

不再使用时，先运行 `agent-rule uninstall /absolute/path/to/project` 查看卸载摘要；如需逐行差异，加 `--details`。审查后运行 `agent-rule uninstall /absolute/path/to/project --apply` 卸载项目规则；项目本地文件会保留。

图形界面安装包见[桌面版 `1.1.0` Release](https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.1.0)，源码和构建方式见[桌面版说明](packages/desktop-app/README.md)。两个平台均需手动安装；安装包尚未签名，Mac 包尚未公证。

## 规则来源

迁移前的两个源目录已从当前工作树清理；如需追溯原文，可查看 Git 提交 `a7ac7b9`。当前安装和维护只使用 `rulepacks/` 中的规则正文，适配器入口在 `adapters/` 维护。

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

发布流程和仍需完成的验收见 [发布说明](docs/releasing.md)与[发布审查记录](docs/publication-review.md)。在没有审查受管文件范围前，不要对已有业务工程直接运行 `init`。

## 仓库结构

```text
packages/core/             平台无关核心逻辑
packages/cli/              agent-rule 命令行工具
packages/desktop-app/      桌面图形界面
adapters/                  平台入口与兼容性说明
plugins/agent-rule-kit/    当前 Codex 插件包与四个规则操作 Skill
rulepacks/                 权威规则包目标目录
workflows/                 平台无关工作流定义的预留位置
schemas/                   版本化数据契约
docs/                      产品结构、安装、发布与验收说明
```
