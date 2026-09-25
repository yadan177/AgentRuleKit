# 发布说明

公开的 `v0.1.0` 与 `v0.1.1` GitHub Release 和 npm CLI 均已发布；以下流程及剩余门槛用于复核已发布版本与准备后续版本，不能把“工作流已存在”等同于已发布。

仓库所有者已确认公开范围，仓库已改为 Public；公开授权、已发布证据和剩余人工验收见[公开发布前审查清单](publication-review.md)。通过 CI 或建立草稿 PR 本身不等于 GitHub Release 或 npm 包已发布。

Release 和 npm 发布作业都要求仓库已经是 Public；Private 状态下即使有人误推版本标签或手动触发 npm 工作流，发布作业也会跳过。这是防误操作保护，不代替内容授权审查和仓库所有者的发布决定。

1. 完成代码、文档、历史提交和归档目录的公开安全审计，并确认 Apache-2.0 `LICENSE` 适用于本仓库内容。
2. 在 Linux、macOS、Windows 的 Node.js 22/24 CI 上通过构建、测试和 npm 打包检查；用独立临时项目验证 Go、TypeScript、Unity 的安装、差异、更新、冲突与幂等性。
3. 将 GitHub 仓库改为 Public（已完成，2026-09-25）。用户可在此后添加仓库插件市场。
4. 使根包、核心包、Codex 适配器、CLI、插件和规则包版本与 Git 标签一致，推送 `vX.Y.Z` 标签。首个 `v0.1.0` 已于 2026-09-25 发布：[GitHub Release](https://github.com/yadan177/AgentRuleKit/releases/tag/v0.1.0) 包含 `agentrulekit-rulepacks.tar.gz`；API 摘要为 `sha256:5fb08eb19c8cabe0195a79d6f8197d4751080c727d7686b30bbe5eb9f67051dc`，下载校验及归档来源提交均与标签指向的 `09567ea2e51dfa53e191317be0620feaaed2165f` 一致。发布后运行 `npm run smoke:public`，将当前 CLI 打包安装进临时目录，在 Go、TypeScript、Unity 临时工程从最新正式 Release 完成安装与同版本检查；若需要断言特定最新版本，当前可用 `npm run smoke:public -- 0.1.1`。后续版本仍须逐次验证，且这项检查不能替代从 npm 注册表安装或真实跨版本更新。
5. 仓库所有者已在自己的 npm 账户启用 2FA；从固定的 `v0.1.0` 标签通过 `npm publish --workspace agentrulekit --access public` 完成 [`agentrulekit@0.1.0`](https://www.npmjs.com/package/agentrulekit) 首次发布（2026-09-25）。npm 注册表返回 `agent-rule` 命令入口和 SHA-512 integrity `sha512-JN3A+u32Aw20NI+W65IB3lERMV9bkYf0s53RiCmq5pCQv28TS45nkm2bRttMP5sgMIKfi3KZ6vJyaFlxzwUTSw==`。发布期间认证在 npm 页面完成，密码、令牌和验证码未写入仓库。所有者随后授权配置 npm Trusted Publisher；`npm trust list agentrulekit` 已返回 GitHub 仓库 `yadan177/AgentRuleKit`、工作流文件 `publish-npm.yml` 与 `publish, stage publish` 权限（2026-09-25）。此工作流使用兼容 Node.js 24 的 npm CLI `11.15.0`，并声明 `id-token: write`；从对应标签手动触发，发布前核对同版本 GitHub Release 的规则包摘要和来源提交。`v0.1.1` 已通过该工作流的实际 OIDC 发布验收。不要对已发布的版本重复触发 npm 发布。

   注意：`v0.1.0` 标签已固定，已发布的 npm 包包含 CLI 和 `LICENSE`，但没有包级 README；`0.1.1` 已包含中文包级 README。不要为补文档重写既有标签或尝试重发相同版本。
6. 已在隔离环境从 npm 注册表安装 `agentrulekit@0.1.0` 和 `agentrulekit@0.1.1`，并在 Go、TypeScript、Unity 临时工程完成同版本与真实跨版本验收。后续版本可运行 `npm run smoke:npm -- X.Y.Z` 重复同版本联网验收；跨版本还须先在旧 Release 初始化工程，再依次执行 `check`、`diff`、经审查的 `update --apply` 和 `validate`。Codex 插件的公开市场 CLI 安装已验收；桌面端 Skill 实际调用及 Hook 信任/调度仍按[桌面端验收记录](codex-desktop-acceptance.md)继续。

## `v0.1.1` 发布与跨版本证据

- [标签 CI](https://github.com/yadan177/AgentRuleKit/actions/runs/36104809030)在三个操作系统的 Node.js 22/24 上通过检查并生成 [GitHub Release](https://github.com/yadan177/AgentRuleKit/releases/tag/v0.1.1)。规则包 SHA-256 为 `sha256:ac5587543b5606b0ab2f051180d3216b7aa4a78224fe59a132e1e3a624efcabb`，归档记录的来源提交是 `edcf84789d6bc461d2757f1230f0b83be2316e0d`；`verify-published-release.mjs` 已核对实际下载与 API 元数据。
- [npm 发布作业](https://github.com/yadan177/AgentRuleKit/actions/runs/36104950806)从同一标签成功发布 `agentrulekit@0.1.1`，日志显示 GitHub Actions 签名 provenance。npm 注册表返回 CLI 入口、integrity `sha512-qTIFOUJnTa5s9sH2GK+Tg2uwDmnBioCR3ycrlVGOuWhAQawblmOuisxUiSm3oFL8hkVUKnSMXxYEEtk6w2ECwQ==` 和 provenance attestation；从注册表全新安装并运行 `npm run smoke:npm -- 0.1.1` 通过。
- 预先使用 npm 的 `0.1.0` CLI 在隔离 Go、TypeScript、Unity 工程安装真实旧版 Release。新 Release 发布后，旧 CLI 的 `check` 均以退出码 3 报告 `0.1.0 → 0.1.1`；`diff` 显示通用规则正文差异且预览不改锁文件。使用 npm 的 `0.1.1` CLI 显式应用后，三类工程的 `validate/check/diff` 均通过且无待更新文件；重复应用锁文件哈希不变。
- 在另一个从真实 `v0.1.0` 资产初始化的隔离工程中，手动运行插件 Hook 查询真实 GitHub 最新 Release，得到 `0.1.0 → 0.1.1` 提醒；缓存摘要匹配 `v0.1.1`，锁文件未改。审查差异、应用更新后再次运行 Hook 不再提醒。该实验不证明 Codex 桌面端实际调度 Hook。

Release 更新不会自动修改业务项目。每个项目由成员查看差异后决定何时运行 `update --apply`。

后续版本的 GitHub 规则包 Release 资产会在根目录附带本仓库的 `LICENSE`；解包器仍接受旧版不含该文件的资产。已发布的 `v0.1.0`、`v0.1.1` 资产不会被追溯修改。资产附带仓库许可文本不代表各规则文件的第三方来源或授权已完成逐项复核，也不代表许可文本已随规则安装进业务项目；这些问题继续按[内容权利复核表](content-rights-review.md)处理。
