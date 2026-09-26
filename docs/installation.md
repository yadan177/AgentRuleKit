# 安装与更新

## 三个安装位置

- `agentrulekit` CLI 安装在个人电脑，负责检测、下载、校验和更新。
- Codex 插件安装在个人 Codex 环境，提供对话工作流与后台版本提醒。它不是规则正文的存储位置。
- 选定的规则包复制进业务项目的 `.agent-rules/`，与 `agent-rules.yaml`、`.agent-rules.lock.json` 和 `AGENTS.md` 一同提交 Git。项目本地规则写在 `.agent-rules/overrides.md`。

从 `v0.1.2` 起，如果规则源包含根目录的普通文本 `LICENSE`，安装器还会把它复制为业务项目中的 `.agent-rules/LICENSE`，记录在锁文件并纳入后续差异预览和完整性校验。已有同名未知文件时会停止，不会覆盖。已发布的 `v0.1.0`、`v0.1.1` GitHub Release 不含该文件，不能因此补出一份许可文本；此文件也不能代替对各规则正文中第三方材料的逐项权利核对。

因此，一台电脑可以维护多个项目；项目成员即使尚未安装插件，也能从项目 Git 仓库读取已固定版本的规则。

## 从 npm 首次安装

需要 Node.js 22+、npm 和可访问 GitHub 的网络。

```bash
npm install -g agentrulekit
agent-rule detect /absolute/path/to/project
agent-rule init /absolute/path/to/project
agent-rule validate /absolute/path/to/project
```

默认来源是 `yadan177/AgentRuleKit` 的最新正式 GitHub Release。CLI 验证 Release 资产的 SHA-256 后才解包；下载、校验或规则清单有问题时不会安装。初始化会保留已有 `AGENTS.md` 的非受管内容，若目标位置已有未知文件则停止并报告冲突。请审查并提交上述生成文件。

`agentrulekit@0.1.4` 已在 npm 公开发布；上面的安装命令已在隔离环境从 npm 注册表验证。`v0.1.4` GitHub Release 也已可用；独立临时工程通过本版同版本验收，正式 npm 包在现有 Unity 项目通过安装、校验、卸载并恢复测试前状态。请仍先在临时工程试用，再决定是否安装到现有业务项目。

`init` 会先打印检测到的技术栈依据和建议规则包，然后尝试安装；它不会等待二次确认。若希望先判断技术栈而不写入项目，只运行 `detect`。规则更新与首次初始化不同，始终先用 `diff` 审查，再显式执行 `update --apply`。

TypeScript 工程即使没有 `package.json`，只要项目根目录有 `tsconfig.json`，也会识别为 TypeScript 并安装其 JavaScript 基线依赖；技术栈检测仍以目标工程的实际文件为准。

锁文件会固定 Release 版本、资产摘要和压缩包声明的 Git 来源提交。下载的压缩包必须带有与 Release 版本一致的来源记录；所选规则包的 manifest 版本也必须与 Release 一致，缺失或不一致时拒绝安装。资产摘要保证下载内容一致；来源提交仍须信任仓库发布者，必要时可与 Git 标签人工核对。同一版本的资产摘要若发生变化，CLI 会拒绝更新并提示核查发布源，而不是把被替换的文件当作普通更新。

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

`validate` 只检查本地安装完整性，包括配置、锁文件与已安装规则包的依赖关系；若配置删除了规则包但还没应用更新，会提示旧包仍在。`check` 对比规则源版本，不写文件；发现新版本时退出码为 3。`diff` 展示将增删改的文件内容，不写文件。`update` 默认也只是预览，只有带 `--apply` 才应用；应用前会重新核对刚才展示的差异，若规则源或项目在这期间变化就拒绝写入。应用失败会尝试恢复原文件；若回滚失败，命令会报告保留的恢复副本位置。规则文件被手工修改、`AGENTS.md` 受控区块漂移或新版本碰到未知文件时，更新会停止，不会静默覆盖。

如果机器在更新中突然停止，下一次 `validate` 会报告中断事务，`diff/update` 会拒绝继续。先运行 `agent-rule recover <project-root>` 查看恢复目录，审查后执行 `agent-rule recover <project-root> --apply`；原版本会恢复，中断时留下的新文件另存于恢复副本中。若恢复过程自身再次中断，确认无仍在运行的写入进程并处理遗留操作锁后可重试；已保留的未完成控制文件副本不会被恢复后的旧文件覆盖。

初始化、应用更新和执行恢复时，CLI 会在项目根目录临时创建 `.agent-rules.operation.lock`，阻止同一工程的并发写入；预览与校验遇到锁也会提示等待。正常结束会移除它。若进程异常退出而留下锁，**不要直接重试或覆盖**：先确认没有仍在运行的 `agent-rule` 进程，审查项目与可能存在的事务目录，再将锁文件移走留存，按需执行 `recover` 和 `validate`。该临时锁不应提交到业务项目 Git。

插件启用并被信任后，会在 Codex 会话开始时后台检查；同一项目安装状态下至多每天检查一次。发现新版本只在后续适合的对话里提醒用户，不会自动更新，也不会主动开启新对话。

## 卸载业务项目中的规则

```bash
agent-rule uninstall /absolute/path/to/project
agent-rule uninstall /absolute/path/to/project --details
agent-rule uninstall /absolute/path/to/project --apply
```

当前源码中，第一条命令只显示卸载摘要及保留文件清单；如需逐行审查所有删除内容，运行带 `--details` 的第二条命令。`--apply` 会重新核对计划后才写入，成功时只显示结果摘要。此项输出改进尚未发布，已发布的 `agentrulekit@0.1.4` 仍默认打印完整差异，也没有 `--details` 参数。

卸载无需访问 GitHub，只删除锁文件登记且未被手工修改的规则文件、项目配置和锁文件。`AGENTS.md` 只移除 AgentRuleKit 受控区块；文件完全由该区块组成时才删除整个文件。`.agent-rules/overrides.md` 和其他非受管内容原地保留。配置、锁文件或受管文件异常时命令会停止，可先用 `recover` 处理已中断事务。此命令不会卸载个人电脑上的 CLI 或 Codex 插件。

## 本地开发与离线试用

若只想离线试用，请先准备独立临时工程，再用下面的 `--source-workspace` 命令从本仓库安装规则。此方式不访问 GitHub，也不安装个人插件；试用后可在临时工程运行 `check`、`diff` 和经审查的 `update --apply`。正式 npm 包已单独通过真实远端初始化验证；本地试用不代替真实跨版本更新验收。

在 AgentRuleKit 仓库运行 `npm ci && npm run build`。若要从源码试用已发布的最新正式规则源，在临时工程运行：

```bash
node packages/cli/dist/index.js init /absolute/path/to/test-project
node packages/cli/dist/index.js validate /absolute/path/to/test-project
```

CLI 会联网读取最新正式 GitHub Release。若只想离线使用本地规则源，则改用：

```bash
node packages/cli/dist/index.js init /absolute/path/to/test-project --source-workspace /absolute/path/to/AgentRuleKit
```

本地试用配置会记录 `workspace` 来源，之后的 `check`、`diff` 和 `update` 都读取该本地仓库；不要把指向个人绝对路径的测试配置提交到正式业务项目。
本地规则源仍需由使用者信任；CLI 会校验将安装的规则包清单和文件路径，拒绝规则源内部的符号链接与畸形清单，但这不等同于对规则正文来源或版权的审查。
