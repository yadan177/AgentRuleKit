# 发布说明

首个公开版本必须按以下顺序验收，不能把“工作流已存在”等同于已发布。

当前仓库应保持私有，先完成 [公开发布前审查清单](publication-review.md)。通过 CI 或建立草稿 PR 不等于获得公开发布授权。

1. 完成代码、文档、历史提交和归档目录的公开安全审计，并确认 Apache-2.0 `LICENSE` 适用于本仓库内容。
2. 在 Linux、macOS、Windows 的 Node.js 22/24 CI 上通过构建、测试和 npm 打包检查；用独立临时项目验证 Go、TypeScript、Unity 的安装、差异、更新、冲突与幂等性。
3. 将 GitHub 仓库改为 Public。用户可在此后添加仓库插件市场。
4. 使 `packages/cli/package.json` 版本与 Git 标签一致，推送 `vX.Y.Z` 标签。CI 将建立 Release，并上传 `agentrulekit-rulepacks.tar.gz`。必须确认资产存在且 GitHub 返回 SHA-256 digest，才可试运行远程 `init`。
5. 在 npm 账户上完成 `agentrulekit` 首次发布所需的所有权与认证设置，并将 `publish-npm.yml` 配置为可信发布者。工作流要求 npm CLI 11.5.1+、Node.js 22.14+ 和 GitHub `id-token: write`。之后从对应标签手动触发 npm 发布；首次发布前不能假定 npm 包名已经归本项目所有。
6. 在干净环境运行 `npm install -g agentrulekit`、远程 `init`、`validate`、`check`、`diff`、`update`，并验证 Codex 插件安装及 Hook 信任流程。

Release 更新不会自动修改业务项目。每个项目由成员查看差异后决定何时运行 `update --apply`。
