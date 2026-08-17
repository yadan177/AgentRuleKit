# AgentRuleKit 产品设计与实施方案

> 文档状态：方案草案  
> 当前阶段：Codex First  
> 长期方向：跨 AI 编程工具、跨模型、跨编辑器  
> 更新日期：2026-08-17

---

## 1. 项目概述

AgentRuleKit 是一套面向 AI 编程代理的工程规则与工作流分发系统。它以本仓库现有的多语言开发规则、技术文档规则和 AI 工具适配器为基础，将规则内容进一步产品化，使团队能够在多个业务工程中完成规则安装、任务路由、版本锁定、差异检查和受控升级。

AgentRuleKit 的核心不是某个编辑器插件，也不绑定某个模型。系统由平台无关的规则核心、工作流定义、命令行工具和平台适配器组成。第一阶段以 Codex 为主要运行环境，先完成可安装、可执行、可更新的闭环；后续再扩展 Cursor、TRAE、Qoder、Claude Code、GitHub Copilot 及其他工具。

产品定位：

> AgentRuleKit 是一个将统一 AI 开发规则编译、安装并持续同步到不同 AI 编程工具的工程规则包管理器。

## 2. 背景与现有基础

当前仓库已经包含以下核心资产：

1. Python、Go、Java、JavaScript、TypeScript、Unity 和 PICO 等开发规则。
2. 多种技术栈对应的技术文档编写与维护规则。
3. 规则总览、AI 通用入口、专题规则和任务路由机制。
4. Codex、TRAE 等工具的适配入口模板。
5. 规则格式、链接、入口和危险命令检查脚本。

当前主要问题不是缺少规则，而是缺少统一的产品化能力：

1. 规则需要人工复制到不同业务工程。
2. 已安装规则缺少明确的来源版本和更新记录。
3. 不同 AI 工具的配置文件需要分别维护，容易产生内容漂移。
4. 规则、Skill、插件和项目本地约定之间的职责边界尚未固化。
5. 团队无法稳定判断某个工程安装了哪些规则、是否落后于最新版本。

## 3. 产品目标

### 3.1 第一阶段目标

第一阶段以 Codex 为主，完成以下能力：

1. 通过统一 CLI 检测目标工程的技术栈。
2. 选择并安装适用的开发规则和技术文档规则。
3. 为目标工程生成简洁的 `AGENTS.md` 入口。
4. 提供 Codex Plugin，打包可复用 Skills。
5. 锁定规则包版本、来源提交和文件校验值。
6. 检查新版本、展示差异并安全更新规则。
7. 保留项目本地覆盖规则，不在升级时被覆盖。
8. 在 CI 中验证规则完整性并检查版本状态。

### 3.2 长期目标

1. 使用同一份规则源生成 Cursor、TRAE、Qoder 等工具的配置。
2. 对原生支持 Skills、命令、Hooks、MCP 的工具输出相应能力。
3. 对能力较弱的工具提供规则文件或提示词降级方案。
4. 支持团队私有规则包和公共规则包组合。
5. 支持自动创建规则升级 Pull Request。
6. 在确有集中治理需求时增加远程规则服务或 MCP 服务。

### 3.3 非目标

第一阶段不实现以下内容：

1. 不开发独立桌面 GUI。
2. 不建设在线账号、权限和计费系统。
3. 不要求所有规则存储在远程服务中。
4. 不追求一次性支持所有 AI 编辑器。
5. 不让通用规则覆盖用户要求、目标工程事实或工程自身约定。
6. 不在未经确认的情况下静默更新业务工程规则。

## 4. 核心设计原则

### 4.1 平台无关核心

规则包和工作流必须独立于 Codex。Codex Plugin 只是第一阶段的适配和分发形式，不能成为规则的唯一存储位置。

### 4.2 单一权威规则源

规则正文只在 `rulepacks/` 中维护。`AGENTS.md`、Skills 和其他编辑器配置均通过引用或生成获得，不复制维护完整规则正文。

### 4.3 项目事实优先

规则优先级固定为：

1. 用户当前任务和安全限制。
2. 目标工程代码、依赖、配置、测试与已有约定。
3. 目标工程本地覆盖规则。
4. AgentRuleKit 通用规则包。

### 4.4 按需加载

AI 只读取当前任务相关的入口和专题规则，避免在每次任务中加载整个规则库。

### 4.5 可重复与可审计

同一个配置文件和锁文件必须能够生成一致的项目规则。规则来源、版本和变更必须能够追踪。

### 4.6 更新必须可审查

规则更新先检查、再展示差异、最后应用。自动化更新通过 Pull Request 交付，不直接修改开发者工作区。

## 5. 核心概念

| 概念 | 职责 |
|---|---|
| Rule | 单项工程规范、约束、建议和示例 |
| Rule Pack | 按语言、框架或主题组织的一组规则 |
| Workflow | 平台无关的任务流程，例如代码审查或文档影响检查 |
| Skill | Workflow 在支持 Skill 的 AI 工具中的实现形式 |
| Adapter | 将统一规则和 Workflow 转换为目标工具格式 |
| Plugin | 某个平台上的可安装能力包，可包含 Skills、连接器或 MCP |
| CLI | 负责检测、安装、生成、检查、更新和验证 |
| Override | 业务工程自己的补充或覆盖规则 |
| Lock File | 记录实际安装版本、来源和校验信息 |

需要特别区分运行工具与模型：Codex、Cursor、TRAE 和 Qoder 属于运行工具或 AI 编程环境；DeepSeek 主要是模型或 API 提供方。未来若目标工具使用 DeepSeek 模型，规则仍由目标工具适配器负责加载。直接使用 DeepSeek API 时，可由通用适配器生成 system prompt 或规则上下文包。

## 6. 总体架构

```text
                   AgentRuleKit Repository
                            |
              +-------------+-------------+
              |                           |
         Rule Packs                  Workflows
              |                           |
              +-------------+-------------+
                            |
                     Core Compiler
                            |
              +-------------+-------------+
              |                           |
             CLI                       Adapters
              |                           |
       Project Installation      Codex / Future Tools
              |                           |
        .agent-rules/          AGENTS.md / Skills / Plugin
```

系统分为五层：

1. 内容层：规则包、模板、示例和工作流定义。
2. 核心层：规则解析、依赖解析、合并、校验、版本和差异算法。
3. CLI 层：向用户提供统一安装和维护命令。
4. 适配层：生成不同 AI 工具需要的文件和能力。
5. 分发层：npm 包、GitHub Release、Codex Plugin 和 marketplace。

## 7. 目标仓库目录

```text
AgentRuleKit/
├── rulepacks/
│   ├── common/
│   ├── python/
│   ├── go/
│   ├── java/
│   ├── javascript/
│   ├── typescript/
│   ├── unity/
│   ├── pico/
│   └── project-docs/
├── workflows/
│   ├── bootstrap/
│   ├── implement/
│   ├── review/
│   ├── security-review/
│   ├── doc-impact/
│   └── rules-update/
├── adapters/
│   ├── codex/
│   ├── cursor/
│   ├── trae/
│   ├── qoder/
│   ├── claude-code/
│   ├── github-copilot/
│   ├── deepseek-api/
│   └── generic/
├── plugins/
│   └── agent-rule-kit/
│       ├── .codex-plugin/
│       │   └── plugin.json
│       └── skills/
├── packages/
│   ├── core/
│   └── cli/
├── schemas/
├── templates/
├── tests/
├── scripts/
├── docs/
├── examples/
├── package.json
├── CHANGELOG.md
└── README.md
```

第一阶段只实现 `adapters/codex/` 和 `plugins/agent-rule-kit/`。其他适配器目录可以先保留设计文档或能力清单，不提供未验证的生成结果。

## 8. 安装到业务工程后的结构

```text
TargetProject/
├── .agent-rules/
│   ├── manifest.json
│   ├── common/
│   ├── <language>/
│   ├── project-docs/
│   └── overrides.md
├── .agent-rules.lock.json
├── agent-rules.yaml
├── AGENTS.md
└── <project files>
```

各文件职责：

| 文件 | 是否生成 | 是否允许手动修改 | 作用 |
|---|---:|---:|---|
| `.agent-rules/**` | 是 | 否 | 已安装规则副本 |
| `.agent-rules/overrides.md` | 初始化后由项目维护 | 是 | 项目特有补充规则 |
| `.agent-rules.lock.json` | 是 | 否 | 精确版本和校验信息 |
| `agent-rules.yaml` | 初始化生成 | 是 | 声明规则包和目标工具 |
| `AGENTS.md` | 是或受控合并 | 仅指定区块 | Codex 项目入口 |

已安装规则建议提交到 Git，以保证团队成员、Codex 和 CI 使用相同内容。仅依赖用户机器上的全局规则会导致构建不可重复，因此不作为团队项目的默认模式。

## 9. 项目配置格式

`agent-rules.yaml` 表达项目的期望状态：

```yaml
schemaVersion: 1

source:
  registry: github
  repository: your-org/agent-rule-kit

rulepacks:
  - common
  - typescript
  - project-docs/js-ts

targets:
  - codex

project:
  overrides: .agent-rules/overrides.md

updates:
  channel: stable
  strategy: pull-request
```

`.agent-rules.lock.json` 表达实际安装状态：

```json
{
  "schemaVersion": 1,
  "toolkitVersion": "1.0.0",
  "sourceCommit": "<git-commit>",
  "rulepacks": {
    "common": "1.0.0",
    "typescript": "1.0.0",
    "project-docs/js-ts": "1.0.0"
  },
  "targets": {
    "codex": "1.0.0"
  },
  "files": {
    ".agent-rules/common/entry.md": "sha256:<digest>"
  }
}
```

第一版建议所有规则包跟随仓库统一版本，避免过早引入复杂的独立依赖解析。后续确有需要时再支持规则包独立版本。

## 10. CLI 产品形态

CLI 是跨平台产品核心，暂定命令名为 `agent-rule`。计划通过 npm 发布，也可以通过 GitHub Release 提供独立可执行文件。

### 10.1 命令清单

```text
agent-rule init                 初始化当前工程
agent-rule detect               检测技术栈并输出证据
agent-rule add <pack>           添加规则包
agent-rule remove <pack>        移除规则包
agent-rule target add codex     添加目标工具
agent-rule generate             重新生成目标工具配置
agent-rule check                检查规则版本和本地漂移
agent-rule diff                 展示待更新差异
agent-rule update               应用经确认的规则更新
agent-rule validate             校验配置、规则和生成结果
agent-rule doctor               检查运行环境与适配能力
agent-rule version              输出 CLI 和规则包版本
```

### 10.2 初始化流程

`agent-rule init` 必须执行以下步骤：

1. 定位目标工程根目录。
2. 检查现有 Git 状态和已有 AI 配置，但不覆盖未知内容。
3. 根据依赖文件、源码和配置检测技术栈。
4. 向用户展示检测证据和建议规则包。
5. 生成或更新 `agent-rules.yaml`。
6. 安装规则到 `.agent-rules/`。
7. 通过 Codex Adapter 生成或合并 `AGENTS.md`。
8. 写入 `.agent-rules.lock.json`。
9. 执行 `agent-rule validate`。
10. 输出变更摘要和下一步操作。

不得只根据目录名称猜测技术栈。检测结果必须能够说明依据，例如 `pyproject.toml`、`go.mod`、`package.json`、Unity `ProjectVersion.txt` 或源码扩展名。

## 11. Codex First 实现

### 11.1 Codex Adapter

Codex Adapter 第一阶段负责：

1. 生成项目根目录 `AGENTS.md`。
2. 将入口保持简洁，只路由到 `.agent-rules/` 中的规则。
3. 根据项目安装的技术栈生成任务查表。
4. 保留用户在 `AGENTS.md` 中非 AgentRuleKit 管理的内容。
5. 在生成区块中写入稳定的开始和结束标记，支持幂等更新。

示例：

```md
<!-- agent-rule:start -->
## AgentRuleKit

执行任务前读取 `.agent-rules/common/entry.md`，再按照任务类型读取当前技术栈对应专题规则。项目本地补充规则位于 `.agent-rules/overrides.md`。
<!-- agent-rule:end -->
```

### 11.2 Codex Plugin

Codex Plugin 是 Codex 用户的工作流入口，不承担项目规则版本管理。按照当前官方插件结构，插件至少包含：

```text
plugins/agent-rule-kit/
├── .codex-plugin/
│   └── plugin.json
└── skills/
    ├── rules-bootstrap/
    │   └── SKILL.md
    ├── rules-review/
    │   └── SKILL.md
    ├── rules-doc-impact/
    │   └── SKILL.md
    ├── rules-security-review/
    │   └── SKILL.md
    └── rules-update/
        └── SKILL.md
```

插件中的 Skills 调用或指导使用 `agent-rule` CLI，不直接维护另一份规则正文。

### 11.3 第一阶段 Skills

| Skill | 触发场景 | 主要行为 |
|---|---|---|
| `rules-bootstrap` | 用户希望给工程安装规则 | 检测技术栈、确认规则包、调用初始化流程 |
| `rules-review` | 用户要求代码审查 | 加载相关规则并输出有证据的审查结果 |
| `rules-doc-impact` | 功能发生变化 | 判断技术文档影响并路由到文档规则 |
| `rules-security-review` | 安全审查 | 加载安全规则并检查信任边界 |
| `rules-update` | 检查或升级规则 | 先检查和展示差异，再执行更新 |

Skill 的描述必须聚焦，让 Codex 能够根据任务选择正确 Skill。一个 Skill 不应承载所有开发活动。

### 11.4 Codex Plugin 安装

开发与团队测试阶段使用 GitHub 或本地 marketplace。计划中的安装流程为：

```bash
codex plugin marketplace add your-org/agent-rule-kit
```

然后在 Codex CLI 中运行 `/plugins`，或在 Codex 桌面端 Plugins 页面中安装 AgentRuleKit，并在安装后开启新会话。

刷新 marketplace 来源可使用：

```bash
codex plugin marketplace upgrade
```

项目规则更新仍由 `agent-rule update` 负责。插件包更新与项目规则更新是两个独立生命周期，不能混为一次操作。

## 12. 安装与分发

### 12.1 CLI 安装

npm 包发布后的计划命令：

```bash
npm install -g @agentrulekit/cli
```

不希望全局安装时：

```bash
npx @agentrulekit/cli init
```

在 npm 包正式发布前，可通过仓库脚本或本地 workspace 进行开发测试。文档不得把尚未发布的包描述为已可公开安装。

### 12.2 工程初始化

```bash
cd <target-project>
agent-rule init
```

也可以用于无人值守环境：

```bash
agent-rule init \
  --packs common,typescript,project-docs/js-ts \
  --targets codex \
  --non-interactive
```

无人值守模式必须在配置不完整、输出文件冲突或技术栈判断不可靠时失败，不能自行选择高风险默认值。

## 13. 更新机制

### 13.1 手动更新

标准更新流程：

```bash
agent-rule check
agent-rule diff
agent-rule update
agent-rule validate
```

具体步骤：

1. 读取当前配置和锁文件。
2. 获取目标更新通道的规则清单。
3. 验证来源和版本。
4. 对比 lock 文件中的校验值，识别本地漂移。
5. 生成新增、修改、删除和破坏性变更摘要。
6. 若生成文件被人工修改，则停止更新并要求处理冲突。
7. 经确认后在临时目录生成完整结果。
8. 验证通过后以原子方式替换受管文件。
9. 保留 `overrides.md` 和非受管内容。
10. 更新 lock 文件并输出 Git diff 建议。

### 13.2 自动更新

自动更新采用“检查并创建 Pull Request”，不直接提交到默认分支：

```text
Scheduled CI
    -> agent-rule check --ci
    -> agent-rule update --output <temporary-worktree>
    -> agent-rule validate
    -> create pull request
```

更新 PR 至少包含：

1. 旧版本与新版本。
2. 受影响规则包。
3. 强制规则变化摘要。
4. 生成文件变化。
5. 验证结果。
6. 需要人工确认的兼容性问题。

### 13.3 本地自定义规则

项目特有规则只能写入 `.agent-rules/overrides.md` 或配置声明的其他非受管文件。受管规则目录视为生成产物。

若用户确实需要修改公共规则，应在 AgentRuleKit 源仓库修改并发布新版本，避免多个业务工程形成不可追踪的规则分叉。

## 14. 版本策略

AgentRuleKit 使用语义化版本：

| 版本类型 | 适用变化 |
|---|---|
| PATCH | 错别字、失效链接、无语义变化的表达修正 |
| MINOR | 新增规则、Skill、规则包或兼容能力 |
| MAJOR | 修改强制规则、优先级、生成格式或兼容边界 |

每个发布版本必须包含：

1. Git tag。
2. CHANGELOG。
3. 规则包清单和校验值。
4. CLI 包或可执行文件。
5. Codex Plugin 版本。
6. 迁移说明，若存在破坏性变化。

## 15. 跨工具适配契约

虽然第一阶段只实现 Codex，但核心数据结构必须从第一天保留适配能力。每个 Adapter 至少声明：

```yaml
id: codex
version: 1

capabilities:
  rules: native
  skills: native
  commands: supported
  mcp: supported
  hooks: supported

outputs:
  projectEntry: AGENTS.md
  skillFormat: AgentSkill
```

未来扩展工具时遵循以下规则：

1. 原生支持的能力按目标格式生成。
2. 可以可靠降级的能力转换为规则、命令或提示模板。
3. 无法表达的能力明确报告为 unsupported。
4. 不伪造平台能力，不生成目标工具不会读取的文件。
5. 每个适配器必须具备 fixture 和快照测试。

计划扩展顺序建议为：

1. Codex。
2. Cursor。
3. TRAE。
4. Qoder。
5. Claude Code 和 GitHub Copilot。
6. 通用 Agent Skills、MCP 和 DeepSeek API 输出。

实际顺序可以根据团队使用量和目标工具公开格式稳定性调整。

## 16. 安全与可靠性

1. 安装和更新前解析精确目标目录，不允许对工作区根目录执行递归删除。
2. 不覆盖未知文件；管理已有文件时使用稳定区块标记或明确冲突。
3. 更新包必须校验来源、版本和内容摘要。
4. 插件 Hooks、脚本和 MCP 配置默认视为高权限能力，启用前必须可审查。
5. 第一阶段不需要 MCP；本地规则和 CLI 足以完成核心闭环。
6. CLI 不收集源码、规则内容或工程路径遥测，除非未来明确设计并取得用户同意。
7. 更新失败时保留原有可用版本，不产生半更新状态。

## 17. 测试策略

### 17.1 单元测试

1. 技术栈检测。
2. 规则包依赖解析。
3. 配置和 lock schema 校验。
4. 文件校验值和漂移检测。
5. 受管区块合并。
6. 版本比较和更新计划。

### 17.2 集成测试

1. Python、Go、JavaScript、TypeScript 和 Unity 示例工程初始化。
2. 已有 `AGENTS.md` 工程的非破坏性合并。
3. 规则升级、降级和冲突处理。
4. 幂等生成：连续运行两次结果不变化。
5. 中断恢复和更新失败回滚。

### 17.3 Codex 验证

1. Plugin manifest 能被 Codex 识别。
2. Skills 在新会话中可用。
3. Skill 能正确路由到项目规则。
4. Codex 能按任务只读取相关专题规则。
5. 规则缺失、路径错误或版本不一致时能够明确报告。

## 18. MVP 范围

### 18.1 MVP 必须包含

1. 平台无关的 rule pack manifest。
2. `agent-rule init`。
3. `agent-rule generate`。
4. `agent-rule check`。
5. `agent-rule diff`。
6. `agent-rule update`。
7. `agent-rule validate`。
8. Codex `AGENTS.md` Adapter。
9. Codex Plugin manifest。
10. `rules-bootstrap`、`rules-review`、`rules-doc-impact` 和 `rules-update` Skills。
11. 配置文件和 lock 文件。
12. 至少三个技术栈 fixture 的端到端测试。

### 18.2 MVP 不包含

1. MCP 服务。
2. 桌面管理界面。
3. 在线规则市场。
4. 组织级权限管理。
5. Cursor、TRAE、Qoder 的正式生成器。
6. 复杂的规则包依赖求解器。

## 19. 实施阶段

### 阶段 A：规范化现有资产

1. 建立 rule pack manifest 和 schema。
2. 将现有目录映射为规则包，不立即大规模重写正文。
3. 统一规则入口、规则 ID、版本和依赖关系。
4. 扩充现有规则文档检查脚本。

### 阶段 B：CLI 最小闭环

1. 实现技术栈检测。
2. 实现初始化、生成和验证。
3. 实现 lock 文件和校验值。
4. 实现差异检查和受控更新。

### 阶段 C：Codex 产品化

1. 实现 Codex Adapter。
2. 创建 Codex Plugin 和 Skills。
3. 创建本地或仓库 marketplace。
4. 在真实业务工程中完成安装、使用和升级测试。

### 阶段 D：自动化发布

1. GitHub Release 和 npm 发布。
2. CHANGELOG 和迁移检查。
3. 自动更新 PR 工作流。
4. 稳定版 `1.0.0` 发布。

### 阶段 E：扩展其他工具

按 Adapter 契约依次实现 Cursor、TRAE、Qoder 等目标，并为每个目标维护独立能力矩阵和测试，不修改平台无关规则核心。

## 20. MVP 验收标准

满足以下条件才能认为第一阶段完成：

1. 新工程能够在一次交互流程中完成技术栈检测和规则安装。
2. 安装过程不会覆盖已有未知配置。
3. 同一配置和 lock 文件能够重复生成相同结果。
4. Codex 能通过 `AGENTS.md` 找到正确入口和专题规则。
5. Codex Plugin 中至少四个核心 Skills 可被识别和执行。
6. 规则存在新版本时，用户能先看到差异再更新。
7. 项目本地覆盖规则在更新后保持不变。
8. CI 能发现规则文件漂移、损坏链接和过期版本。
9. 更新中断或验证失败不会破坏当前已安装版本。
10. 完整流程至少在 Python、TypeScript 和 Unity 示例工程中通过验证。

## 21. 已确定的产品决策

1. 产品名暂定为 AgentRuleKit。
2. 核心产品是 CLI 和平台无关规则包，不是 Codex Plugin。
3. 第一阶段以 Codex 为主，但数据模型不绑定 Codex。
4. 规则安装到项目并提交 Git，保证团队一致性。
5. 项目本地规则与受管公共规则分离。
6. 更新通过 lock 文件、校验值和差异审查完成。
7. 自动更新默认创建 Pull Request，不静默修改默认分支。
8. 第一阶段不建设 MCP 和桌面软件。
9. 后续通过 Adapter 扩展 Cursor、TRAE、Qoder 等工具。
10. 第一阶段 CLI 使用 TypeScript/Node.js 实现，并通过 npm workspace 组织核心包和 CLI 包。

## 22. 后续需要确认的问题

1. npm scope 和 GitHub 组织名称使用什么正式名称。
2. 是否直接采用 Rulesync 作为部分适配生成引擎。
3. 第一批试点业务工程和主要技术栈是什么。
4. 公共规则包采用何种开源许可证。
5. 项目是否允许提交完整 `.agent-rules/`，还是仅提交配置和 lock 文件。
6. `AGENTS.md` 已存在时采用受管区块还是单独入口文件。

其中第 5 项建议默认提交完整规则；第 6 项建议使用受管区块，并在检测到冲突时停止而不是覆盖。

## 23. 参考资料

1. [OpenAI Skills & Plugins](https://learn.chatgpt.com/docs/skills-and-plugins)
2. [OpenAI Plugins](https://learn.chatgpt.com/docs/plugins)
3. [OpenAI Plugin Packaging](https://developers.openai.com/plugins/build/plugins)
4. [Rulesync](https://github.com/dyoshikawa/rulesync)
5. [GitHub Spec Kit](https://github.com/github/spec-kit)
6. [Superpowers](https://github.com/obra/superpowers)
