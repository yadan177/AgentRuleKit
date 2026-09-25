# 发布说明

首个公开版本必须按以下顺序验收，不能把“工作流已存在”等同于已发布。

仓库所有者已确认公开范围，仓库已改为 Public；公开授权和剩余发布门槛见[公开发布前审查清单](publication-review.md)。通过 CI 或建立草稿 PR 本身不等于 GitHub Release 或 npm 包已发布。

Release 和 npm 发布作业都要求仓库已经是 Public；Private 状态下即使有人误推版本标签或手动触发 npm 工作流，发布作业也会跳过。这是防误操作保护，不代替内容授权审查和仓库所有者的发布决定。

1. 完成代码、文档、历史提交和归档目录的公开安全审计，并确认 Apache-2.0 `LICENSE` 适用于本仓库内容。
2. 在 Linux、macOS、Windows 的 Node.js 22/24 CI 上通过构建、测试和 npm 打包检查；用独立临时项目验证 Go、TypeScript、Unity 的安装、差异、更新、冲突与幂等性。
3. 将 GitHub 仓库改为 Public（已完成，2026-09-25）。用户可在此后添加仓库插件市场。
4. 使根包、核心包、Codex 适配器、CLI、插件和规则包版本与 Git 标签一致，推送 `vX.Y.Z` 标签。首个 `v0.1.0` 已于 2026-09-25 发布：[GitHub Release](https://github.com/yadan177/AgentRuleKit/releases/tag/v0.1.0) 包含 `agentrulekit-rulepacks.tar.gz`；API 摘要为 `sha256:5fb08eb19c8cabe0195a79d6f8197d4751080c727d7686b30bbe5eb9f67051dc`，下载校验及归档来源提交均与标签指向的 `09567ea2e51dfa53e191317be0620feaaed2165f` 一致。本地打包安装的 CLI 已从该真实 Release 完成临时工程初始化与同版本检查；后续版本仍须逐次验证。
5. `agentrulekit` 首次发布需要仓库所有者使用自己的 npm 账户完成认证、包名占用确认和 2FA。当前公开注册表查询该包返回 404，本机 `npm whoami` 未登录；这不是已取得包名所有权的证明。先从已验收的 `v0.1.0` 标签构建并核对 tarball，由所有者执行首次 `npm publish --workspace agentrulekit --access public`，不要在聊天或 CI 日志中提供密码、令牌或验证码。包创建后，所有者才能在 npm 包设置中将 `.github/workflows/publish-npm.yml` 配为 GitHub Actions 可信发布者，并允许直接 `npm publish`。此工作流要求 npm CLI 11.5.1+、Node.js 22.14+ 和 `id-token: write`；未来版本从对应标签手动触发，发布前会核对同版本 GitHub Release 的规则包摘要和来源提交。不要对已由所有者首次发布的 `v0.1.0` 再触发相同版本的 CI 发布。
6. 在干净环境运行 `npm install -g agentrulekit`、远程 `init`、`validate`、`check`、`diff`、`update`，并验证 Codex 插件安装及 Hook 信任流程。

Release 更新不会自动修改业务项目。每个项目由成员查看差异后决定何时运行 `update --apply`。
