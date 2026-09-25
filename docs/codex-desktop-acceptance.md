# Codex 桌面端验收记录

本清单用于补齐[首版开发计划](development-plan.md)的 Codex 桌面端证据。用户已在本次对话中概括确认插件安装、Hook 审查与信任决定；未提供版本、测试工程和逐项运行结果，因此以下详细验收栏仍待填写。CLI 隔离安装、插件格式校验与 Hook 脚本模拟运行已经通过，但它们不能证明桌面端实际调用了 Skill 或 Hook。

## 当前证据边界（2026-09-24）

| 检查项 | 当前证据 | 结论 |
|---|---|---|
| 仓库本地市场 | `.agents/plugins/marketplace.json` 声明 `agentrulekit` 市场与 `agent-rule-kit` 插件 | 已配置，未证明桌面端显示 |
| 隔离安装与结构 | `scripts/verify-codex-plugin-install.mjs` 在临时 Codex 环境验证安装、四个 Skills 可发现、已安装 Hook 脚本可运行；官方插件校验器通过 | 已通过隔离验收 |
| 当前个人 Codex 环境 | 本机 `codex-cli 0.142.0` 的 `codex plugin list` 未列出 `agent-rule-kit` 或 `agentrulekit` 市场 | 尚未在当前个人环境确认安装 |
| 桌面端插件界面、Skill 实际调用、Hook 信任与会话调度 | 当前任务无法通过桌面端自动化接口读取 Codex 自身界面，且未获得用户的 Hook 信任操作结果 | 待用户实际验收 |
| 真实远端更新提醒 | 本仓库尚无可供默认 CLI 使用的正式 GitHub Release | 发布门槛完成后再验收 |

## 请在桌面端完成的步骤

1. 在 Codex 桌面端打开本仓库项目，重启应用后打开插件目录，查找本地市场“AI开发工具箱”（内部名 `agentrulekit`）及 `agent-rule-kit`。官方[本地市场说明](https://developers.openai.com/plugins/build/plugins)要求仓库市场放在 `.agents/plugins/marketplace.json`，并在桌面端重启后查看。若未显示，先记录现象，不要把“CLI 隔离安装成功”当成桌面端已安装。
2. 如桌面端仍无法发现仓库市场，可由用户在本机明确选择是否运行 `codex plugin marketplace add <AgentRuleKit 仓库绝对路径>`，然后重启桌面端再次查找。该命令会修改个人 Codex 的市场配置；验收人员应记录是否使用了此步骤。
3. 由用户在插件目录安装 `agent-rule-kit`，新建一个任务，分别确认 `rules-bootstrap`、`rules-review`、`rules-doc-impact`、`rules-update` 四个 Skills 可见。用一个临时工程做只读的规则审查试用，记录是否实际调用了 Skill；不要对正式业务工程试装规则。
4. 单独审查 `plugins/agent-rule-kit/hooks/hooks.json` 与 `hooks/session_start.mjs` 后，由用户自行决定是否信任 `SessionStart` Hook。根据[官方插件说明](https://developers.openai.com/plugins/build/plugins)，安装或启用插件不会自动信任其 Hook；未信任时应维持跳过状态，不能为通过验收而绕过信任。
5. Hook 只在锁文件声明 GitHub 来源的项目中向 `api.github.com` 查询该仓库的最新 Release 元数据，缓存写在个人插件数据目录，不自动修改项目。当前还不能验证默认仓库真实新版本提醒；待正式 Release 发布后，再在测试工程中确认“会话启动提醒 → `diff` 审查 → 用户明确执行 `update --apply`”全过程。

## 验收填写

| 记录项 | 结果 |
|---|---|
| 日期、桌面端版本与测试工程 | 待填写 |
| 插件目录是否显示本地市场和插件 | 待填写 |
| 是否通过桌面端安装；是否使用市场添加命令 | 待填写 |
| 四个 Skills 可见及只读试用结果 | 待填写 |
| Hook 定义审查及用户信任决定 | 待填写 |
| 新会话是否实际调度 Hook | 待填写 |
| 正式 Release 后的真实更新提醒 | 待发布后填写 |

只在相应项目得到桌面端实际证据后，才更新[公开发布前审查清单](publication-review.md)的勾选状态。
