# AgentRuleKit 首版开发与跑通计划

产品中文名：AI开发工具箱。目标是让外部用户在自己的项目中安装、审查并更新共享 AI 开发规则；Codex 是第一适配器，核心规则源保持平台无关。

## 首版用户流程

1. 用户在个人电脑安装 `agentrulekit` CLI，可选安装个人 Codex 插件。
2. 对业务项目运行 `detect` 查看技术栈依据，运行 `init` 从正式 GitHub Release 安装匹配规则，并把生成文件提交到业务项目 Git。
3. CLI `check` 或 Codex 插件会话 Hook 发现新版本；Hook 每个项目至多每天检查一次，仅提醒。
4. 用户运行 `diff` 审查具体变化；只有明确决定更新才运行 `update --apply`，随后运行 `validate` 并提交项目 Git。
5. 项目本地覆盖规则、未知文件和 `AGENTS.md` 非受管内容始终保留；冲突时停止，由用户决定处理方式。

## 阶段与验收

| 阶段 | 工作 | 当前状态 | 验收方式 |
|---|---|---|---|
| A. 核心闭环 | 安全初始化、锁文件、完整性校验、版本检查、差异预览、显式更新和中断恢复 | 本地代码已实现 | 自动化端到端测试覆盖 Python、TypeScript、Unity；独立 npm 包在六类技术栈临时工程初始化和校验，并在 Go 工程完成差异预览与显式更新 |
| B. Codex 接入 | 规则入口、四个 Skills、仓库插件市场、可信任后启用的会话后台检查 | 本地代码已实现；隔离 CLI 安装、四个 Skills 发现及已安装 Hook 脚本模拟运行已通过，桌面端交互与 Hook 信任仍待验收 | 插件/Skill 校验；Hook 模拟首次请求、每日缓存与锁变刷新；隔离 CLI 安装及提示输入检查；桌面端验收 |
| C. 公开分发 | 仓库公开、安全审计、GitHub Release 规则包、npm 首次发布、外部干净环境复测 | 仓库已公开；`v0.1.0` Release 摘要和来源提交已核对，`agentrulekit@0.1.0` 已首次发布；从 npm 安装的 CLI 在全新 Go、TypeScript、Unity 临时工程完成真实远程 `init/validate/check/diff/update --apply`（同版本无变更）。正式跨版本更新仍待第二个 Release 验收 | 真实远程安装、npm 独立安装和后续版本更新均通过 |
| D. 后续扩展 | Cursor、TRAE、Qoder 适配器；可选的更新 PR 自动化 | 不在首版范围 | 每个适配器独立能力矩阵与跨平台测试 |

独立 npm 包的六类临时工程测试还会核对生成的 `AGENTS.md`：项目覆盖规则位于读取提示的前面，每个已安装规则包都列出与 `pack.json` 一致且实际存在的入口文件。这验证入口文件路径，不等同于 Codex 模型实际执行了规则。

`scripts/tests/remote-cli-e2e.test.mjs` 用模拟 GitHub Release 响应、真实 tar.gz 资产和 CLI 进程，覆盖远程初始化、版本检查、差异预览、错误摘要拒绝、显式更新及最终校验。`npm run smoke:public` 将当前 CLI 打包安装在隔离目录；`npm run smoke:npm -- 0.1.0` 则从 npm 注册表独立安装指定正式版本。两者均在 Go、TypeScript、Unity 临时工程从真实公开 Release 执行同版本闭环，需要访问网络，不放入每次提交的离线 CI。`agentrulekit@0.1.0` 已通过后者验收；因尚无第二个正式版本，不能把同版本无变更检查当作真实跨版本更新验收。

## 发布前必须过的门槛

- CI 在 Linux、macOS、Windows 的 Node.js 22/24 上运行，并检查 npm 包内容与版本一致性；`npm run check:rulepacks` 检查 manifest、依赖、版本与本地 Markdown 链接。独立 Linux 作业运行 `scripts/check-rule-docs.sh`，检查规则文档结构、相对链接及已知内容冲突；这不代替一般技术准确性或版权审查。
- Git 历史、归档资料、依赖与许可证完成公开审查；不能只依赖简单密钥模式扫描。
- GitHub Release 存在可下载规则包及 SHA-256 digest；失败下载、校验失败和不安全归档不会修改项目。
- npm 包 `agentrulekit` 的所有权、首次发布与 GitHub Actions 可信发布者配置已由仓库所有者完成；下一正式版本仍须验收 OIDC 实际发布，不要求向开发代理提供 npm 密码或令牌。
- 已在全新环境从 npm 和 GitHub Release 公开入口安装并验证；尚未完成的桌面端和真实跨版本验收须在文档中分别说明。

当前实现细节见 [安装与更新](installation.md)；公开前先完成 [审查清单](publication-review.md)，再按 [发布说明](releasing.md) 操作。
