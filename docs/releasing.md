# 发布说明

首个公开版本的 GitHub Release 和 npm CLI 已发布；以下流程及剩余门槛用于复核首版与准备后续版本，不能把“工作流已存在”等同于已发布。

仓库所有者已确认公开范围，仓库已改为 Public；公开授权、已发布证据和剩余人工验收见[公开发布前审查清单](publication-review.md)。通过 CI 或建立草稿 PR 本身不等于 GitHub Release 或 npm 包已发布。

Release 和 npm 发布作业都要求仓库已经是 Public；Private 状态下即使有人误推版本标签或手动触发 npm 工作流，发布作业也会跳过。这是防误操作保护，不代替内容授权审查和仓库所有者的发布决定。

1. 完成代码、文档、历史提交和归档目录的公开安全审计，并确认 Apache-2.0 `LICENSE` 适用于本仓库内容。
2. 在 Linux、macOS、Windows 的 Node.js 22/24 CI 上通过构建、测试和 npm 打包检查；用独立临时项目验证 Go、TypeScript、Unity 的安装、差异、更新、冲突与幂等性。
3. 将 GitHub 仓库改为 Public（已完成，2026-09-25）。用户可在此后添加仓库插件市场。
4. 使根包、核心包、Codex 适配器、CLI、插件和规则包版本与 Git 标签一致，推送 `vX.Y.Z` 标签。首个 `v0.1.0` 已于 2026-09-25 发布：[GitHub Release](https://github.com/yadan177/AgentRuleKit/releases/tag/v0.1.0) 包含 `agentrulekit-rulepacks.tar.gz`；API 摘要为 `sha256:5fb08eb19c8cabe0195a79d6f8197d4751080c727d7686b30bbe5eb9f67051dc`，下载校验及归档来源提交均与标签指向的 `09567ea2e51dfa53e191317be0620feaaed2165f` 一致。发布后运行 `npm run smoke:public`，将当前 CLI 打包安装进临时目录，在 Go、TypeScript、Unity 临时工程从最新正式 Release 完成安装与同版本检查；若需要断言特定最新版本，可用 `npm run smoke:public -- 0.1.0`。后续版本仍须逐次验证，且这项检查不能替代从 npm 注册表安装或真实跨版本更新。
5. 仓库所有者已在自己的 npm 账户启用 2FA；从固定的 `v0.1.0` 标签通过 `npm publish --workspace agentrulekit --access public` 完成 [`agentrulekit@0.1.0`](https://www.npmjs.com/package/agentrulekit) 首次发布（2026-09-25）。npm 注册表返回 `agent-rule` 命令入口和 SHA-512 integrity `sha512-JN3A+u32Aw20NI+W65IB3lERMV9bkYf0s53RiCmq5pCQv28TS45nkm2bRttMP5sgMIKfi3KZ6vJyaFlxzwUTSw==`。发布期间认证在 npm 页面完成，密码、令牌和验证码未写入仓库。所有者随后授权配置 npm Trusted Publisher；`npm trust list agentrulekit` 已返回 GitHub 仓库 `yadan177/AgentRuleKit`、工作流文件 `publish-npm.yml` 与 `publish, stage publish` 权限（2026-09-25）。此工作流使用兼容 Node.js 24 的 npm CLI `11.15.0`，并声明 `id-token: write`；未来版本从对应标签手动触发，发布前会核对同版本 GitHub Release 的规则包摘要和来源提交。可信关系已建立，但 OIDC 实际发布仍须在下一正式版本验收。不要对已发布的 `0.1.0` 再触发相同版本的 CI 发布。

   注意：`v0.1.0` 标签已固定，已发布的 npm 包包含 CLI 和 `LICENSE`，但没有包级 README。当前主分支新增的中文包级 README 与打包测试仅对以后创建的版本标签生效；不要为补文档重写既有标签或尝试重发相同版本。
6. 已在隔离环境从 npm 注册表安装 `agentrulekit@0.1.0`，并在 Go、TypeScript、Unity 临时工程运行远程 `detect/init/validate/check/diff/update --apply/validate`；三类项目均为同版本无待更新，锁文件哈希保持不变。后续版本可运行 `npm run smoke:npm -- X.Y.Z` 重复该联网验收。Codex 插件的公开市场 CLI 安装已验收；桌面端 Skill 实际调用、Hook 信任/调度和真实跨版本更新仍按各自清单继续验收。

Release 更新不会自动修改业务项目。每个项目由成员查看差异后决定何时运行 `update --apply`。
