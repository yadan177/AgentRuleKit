# 安装与更新

## 三个安装位置

- `agentrulekit` CLI 安装在个人电脑，负责检测、下载、校验和更新。
- Codex 插件安装在个人 Codex 环境，提供对话工作流与后台版本提醒。它不是规则正文的存储位置。
- 选定的规则包复制进业务项目的 `.agent-rules/`，与 `agent-rules.yaml`、`.agent-rules.lock.json` 和 `AGENTS.md` 一同提交 Git。项目本地规则写在 `.agent-rules/overrides.md`。

因此，一台电脑可以维护多个项目；项目成员即使尚未安装插件，也能从项目 Git 仓库读取已固定版本的规则。

## 公开发布后的首次安装

需要 Node.js 22+、npm 和可访问 GitHub 的网络。

```bash
npm install -g agentrulekit
agent-rule detect /absolute/path/to/project
agent-rule init /absolute/path/to/project
agent-rule validate /absolute/path/to/project
```

默认来源是 `yadan177/AgentRuleKit` 的最新正式 GitHub Release。CLI 验证 Release 资产的 SHA-256 后才解包；下载、校验或规则清单有问题时不会安装。初始化会保留已有 `AGENTS.md` 的非受管内容，若目标位置已有未知文件则停止并报告冲突。请审查并提交上述生成文件。

`init` 会先打印检测到的技术栈依据和建议规则包，然后尝试安装；它不会等待二次确认。若希望先判断技术栈而不写入项目，只运行 `detect`。规则更新与首次初始化不同，始终先用 `diff` 审查，再显式执行 `update --apply`。

锁文件会固定 Release 版本、资产摘要和压缩包声明的 Git 来源提交。下载的压缩包必须带有与 Release 版本一致的来源记录；缺失或不一致时拒绝安装。资产摘要保证下载内容一致；来源提交仍须信任仓库发布者，必要时可与 Git 标签人工核对。同一版本的资产摘要若发生变化，CLI 会拒绝更新并提示核查发布源，而不是把被替换的文件当作普通更新。

首版只接受正式 stable 版本。如果 GitHub 返回的“最新 Release”低于项目锁定版本，`check`、`diff` 和 `update` 会停止并提示核查发布源，不会自动降级；Codex Hook 只发安全警告，不会把旧版本称为新版本。

Codex 插件可通过仓库市场安装：

```bash
codex plugin marketplace add yadan177/AgentRuleKit
codex plugin add agent-rule-kit@agentrulekit
```

插件的 `SessionStart` Hook 需要用户在 Codex 中单独审查并信任；不信任时 Skill 仍可使用，但不会自动检查更新。Hook 运行环境需要 Node.js。

## 更新

```bash
agent-rule validate /absolute/path/to/project
agent-rule check /absolute/path/to/project
agent-rule diff /absolute/path/to/project
agent-rule update /absolute/path/to/project --apply
agent-rule validate /absolute/path/to/project
```

`validate` 只检查本地安装完整性。`check` 对比规则源版本，不写文件；发现新版本时退出码为 3。`diff` 展示将增删改的文件内容，不写文件。`update` 默认也只是预览，只有带 `--apply` 才应用。应用失败会尝试恢复原文件；若回滚失败，命令会报告保留的恢复副本位置。规则文件被手工修改、`AGENTS.md` 受控区块漂移或新版本碰到未知文件时，更新会停止，不会静默覆盖。

如果机器在更新中突然停止，下一次 `diff/update` 会检测到中断事务并拒绝继续。先运行 `agent-rule recover <project-root>` 查看恢复目录，审查后执行 `agent-rule recover <project-root> --apply`；原版本会恢复，中断时留下的新文件另存于恢复副本中。

插件启用并被信任后，会在 Codex 会话开始时后台检查；同一项目安装状态下至多每天检查一次。发现新版本只在后续适合的对话里提醒用户，不会自动更新，也不会主动开启新对话。

## 尚未公开发布时的本地试用

在 AgentRuleKit 仓库运行 `npm ci && npm run build`，然后使用本地规则源初始化临时工程：

```bash
node packages/cli/dist/index.js init /absolute/path/to/test-project --source-workspace /absolute/path/to/AgentRuleKit
```

本地试用配置会记录 `workspace` 来源，之后的 `check`、`diff` 和 `update` 都读取该本地仓库；不要把指向个人绝对路径的测试配置提交到正式业务项目。
本地规则源仍需由使用者信任；CLI 会校验将安装的规则包清单和文件路径，拒绝规则源内部的符号链接与畸形清单，但这不等同于对规则正文来源或版权的审查。
