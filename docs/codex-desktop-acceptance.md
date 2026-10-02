# Codex 桌面端验收记录

> 历史记录：下列步骤针对已经从当前源码退役的 `agent-rule-kit` Codex 插件包，仅保留旧版本的验收证据，不再作为新架构发布门槛。个人 Codex 中已安装的旧包不会随仓库删除而自动卸载。

本清单用于补齐[发布审查记录](publication-review.md)中的 Codex 桌面端证据。用户已在此前对话中概括确认插件安装、Hook 审查与信任决定；未提供版本、测试工程和逐项运行结果，因此以下详细验收栏仍待填写。CLI 隔离安装、插件格式校验与 Hook 脚本模拟运行已经通过，但它们不能证明桌面端实际调用了 Skill 或 Hook。

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

## 退役后的处理

旧插件的详细桌面调用与 Hook 调度尚无完整验收证据；现在不再安排安装试验。个人 Codex 中若仍有 `agent-rule-kit@agentrulekit`，请从 Codex 插件管理中卸载。历史验证步骤可从退役前的 Git 提交查阅。
