# Codex 桌面端验收记录

本清单用于补齐[首版开发计划](development-plan.md)的 Codex 桌面端证据。用户已在本次对话中概括确认插件安装、Hook 审查与信任决定；未提供版本、测试工程和逐项运行结果，因此以下详细验收栏仍待填写。CLI 隔离安装、插件格式校验与 Hook 脚本模拟运行已经通过，但它们不能证明桌面端实际调用了 Skill 或 Hook。

## 当前证据边界（2026-09-25）

| 检查项 | 当前证据 | 结论 |
|---|---|---|
| 仓库本地市场 | `.agents/plugins/marketplace.json` 声明 `agentrulekit` 市场与 `agent-rule-kit` 插件 | 已配置，未证明桌面端显示 |
| 隔离安装与结构 | `scripts/verify-codex-plugin-install.mjs` 在临时 Codex 环境验证安装、四个 Skills 可发现、已安装 Hook 脚本可运行；官方插件校验器通过 | 已通过隔离验收 |
| 公开仓库市场安装 | 在独立的临时 `CODEX_HOME` 中运行 `codex plugin marketplace add yadan177/AgentRuleKit` 和 `codex plugin add agent-rule-kit@agentrulekit`；安装结果为 `0.1.0`，来源是公开 Git 仓库，缓存含四个 Skills 与 Hook，`codex debug prompt-input` 列出四个 Skills | 已通过远端 CLI 安装验收；未修改个人配置 |
| 当前个人 Codex 环境 | 2026-09-25 再次用 `codex-cli 0.142.0` 在本仓库运行 `codex plugin list`、`codex plugin marketplace list --json`，并尝试通过 `codex -C <本仓库绝对路径>` 指定工作根；CLI 均未列出 `agent-rule-kit` 或 `agentrulekit` 市场。仓库清单文件存在且隔离安装通过；CLI 的缺席不能证明桌面端也缺席 | 个人 CLI 未见安装；桌面端仍待用户核对 |
| 桌面端插件界面、Skill 实际调用、Hook 信任与会话调度 | 当前任务无法通过桌面端自动化接口读取 Codex 自身界面，且未获得用户的 Hook 信任操作结果 | 待用户实际验收 |
| 真实远端更新提醒 | `v0.1.1` 已发布；在固定真实 `v0.1.0` 的隔离工程手动运行 Hook，真实联网得到 `0.1.0 → 0.1.1` 提醒，更新后不再提醒，锁文件未被 Hook 修改 | Hook 脚本联网行为已验收；桌面端会话是否实际调度仍待用户验收 |
| 可供桌面端打开的旧版测试工程 | 2026-09-25 在本机 `~/Documents/AgentRuleKit-Desktop-Acceptance-*` 下另建独立 TypeScript 工程，使用真实 `v0.1.0` Release 规则资产及其摘要初始化；`validate` 通过，`check` 返回 `0.1.0 → 0.1.1` 与退出码 3；在独立插件数据目录手动运行当前 Hook 后得到提醒，锁文件 SHA-256 未变化 | 测试工程已备好；仍须用户在桌面端实测，不能把手动运行视作实际调度 |

## 请在桌面端完成的步骤

1. 在 Codex 桌面端打开本仓库项目，重启应用后打开插件目录，查找本地市场“AI开发工具箱”（内部名 `agentrulekit`）及 `agent-rule-kit`。官方[本地市场说明](https://developers.openai.com/plugins/build/plugins)要求仓库市场放在 `.agents/plugins/marketplace.json`，并在桌面端重启后查看。若未显示，先记录现象，不要把“CLI 隔离安装成功”当成桌面端已安装。
2. 如桌面端仍无法发现仓库市场，可由用户在本机明确选择是否运行 `codex plugin marketplace add yadan177/AgentRuleKit`（公开仓库来源），或 `codex plugin marketplace add <AgentRuleKit 仓库绝对路径>`（本地开发来源），然后重启桌面端再次查找。该命令会修改个人 Codex 的市场配置；验收人员应记录使用了哪一种来源。`codex plugin marketplace list` 与 `codex plugin list` 可只读核对 CLI 当前可见状态，但不能替代桌面端的插件目录观察。
3. 由用户在插件目录安装 `agent-rule-kit`，新建一个任务，分别确认 `rules-bootstrap`、`rules-review`、`rules-doc-impact`、`rules-update` 四个 Skills 可见。用一个临时工程做只读的规则审查试用，记录是否实际调用了 Skill；不要对正式业务工程试装规则。
4. 单独审查 `plugins/agent-rule-kit/hooks/hooks.json` 与 `hooks/session_start.mjs` 后，由用户自行决定是否信任 `SessionStart` Hook。根据[官方插件说明](https://developers.openai.com/plugins/build/plugins)，安装或启用插件不会自动信任其 Hook；未信任时应维持跳过状态，不能为通过验收而绕过信任。
5. Hook 只在锁文件声明 GitHub 来源的项目中向 `api.github.com` 查询该仓库的最新 Release 元数据，缓存写在个人插件数据目录，不自动修改项目。`v0.1.1` 已发布；脚本级真实联网测试已覆盖“提醒 → `diff` 审查 → 显式 `update --apply` → 提醒消失”。本机另有可打开的固定 `v0.1.0` 临时工程，路径见交付对话。请在其中新建会话，确认 Codex 实际调度已信任的 Hook。由于配置为后台 Hook，[官方说明](https://learn.chatgpt.com/docs/hooks)指出结果会在下一安全时点交给模型；若当前请求已经结束，可能要等下一轮提问，并不会主动开启新对话。因此首轮未见提醒时再问一次并记录现象；不能用手动运行脚本代替桌面端验收。

## 验收填写

| 记录项 | 结果 |
|---|---|
| 日期、桌面端版本与测试工程 | 待填写 |
| 插件目录是否显示本地市场和插件 | 待填写 |
| 是否通过桌面端安装；是否使用市场添加命令 | 待填写 |
| 四个 Skills 可见及只读试用结果 | 待填写 |
| Hook 定义审查及用户信任决定 | 待填写 |
| 新会话是否实际调度 Hook | 待填写 |
| 正式 Release 后的真实更新提醒 | 脚本手动联网通过；桌面端实际会话提醒待填写 |

只在相应项目得到桌面端实际证据后，才更新[公开发布前审查清单](publication-review.md)的勾选状态。
