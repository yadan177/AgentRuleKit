# 发布与后续审查记录

当前决定：仓库所有者已在本次对话中确认 `rulepacks/`、迁移前的规则副本和 Git 历史可以公开；仓库已于 2026-09-25 改为 **Public**，`v0.1.0`、`v0.1.1`、`v0.1.2` 的 GitHub Release 与 npm 包均已发布。迁移前的副本现已从当前工作树清理，但仍存在于 Git 历史。这是所有者的授权声明，不代表开发代理独立核实了每份材料的权属；剩余人工内容审查与 Codex 桌面端验收仍按下述清单处理。

2026-09-24 至 25 日的自动筛查结果和限制汇总在下文；旧快照仍可从对应 Git 提交查阅。[逐文件来源索引](rulepack-provenance-inventory.md)与[内容权利复核表](content-rights-review.md)用于后续人工审查；机器筛查不代替人工授权确认。

## 内容与授权

所有者已确认公开范围；下列逐文件来源证据表仍未录入具体作者、许可与例外信息，不能把空白表格当作第三方权利证明。后续如需可审计的逐文件记录，继续按[内容权利复核表](content-rights-review.md)补齐。

- [ ] 逐项确认 `rulepacks/` 中的规则、示例和引用材料的来源、作者及可公开分发权限。
- [ ] 优先核对[上游许可线索与具体待核位置](content-rights-review.md#上游许可线索与优先复核项2026-09-24)中的 Java P3C、Uber Go 引用和未定位的 Go API 源材料，再覆盖其余没有显式来源声明的规则。
- [ ] 单独检查 Git 历史中的迁移前规则副本：它们已从当前工作树清理，但公开仓库仍保留旧提交。按需从提交 `a7ac7b9` 查阅旧文件，并核对来源、授权及隐私；从当前工作树删除不等于从 Git 历史移除。
- [ ] 核对 `LICENSE` 的 Apache-2.0 声明是否适用于准备公开的全部自有内容；第三方内容按原许可处理。必要时请权利人或法务确认。

## 安全与隐私

- [x] 2026-09-25 对 `main` 提交 `11662f4` 的本地可达 Git 历史运行脱敏模式复扫：87 个提交、2051 个对象，1161 个可读取的 UTF-8 文本 blob 均已扫描，无二进制或超限跳过。历史 Sentry URL 用户信息候选为 `xxx` 占位符，内部 URL 候选是扫描器合成测试；提交元数据中还有 1 个个人邮箱和 1 个 GitHub 合并机器人地址。此项只代表当时本地可达引用的模式筛查与候选结构复核，不代表人工审查通过。
- [ ] 审查当前文件和完整 Git 历史中的凭据、个人信息、内部域名、客户资料、私有项目名及可追溯的业务代码；模式扫描只能辅助，不能替代人工审查。
- [x] 已复核当前依赖、GitHub Actions 权限、Release 资产验证与插件 Hook 的联网行为（2026-09-25）：`npm audit --omit=dev` 和完整 `npm audit` 均报告 0 条当前已知漏洞；CI 默认 `contents: read`，仅公开版本标签的 Release 作业使用 `contents: write`，npm 发布工作流使用 `contents: read` 与 `id-token: write`；`verify-published-release.mjs` 已通过 `v0.1.0` 和 `v0.1.1` 的摘要与来源提交校验；Hook 仅对锁文件声明的 GitHub 来源查询 `api.github.com` 最新 Release，缓存写在 `PLUGIN_DATA`，不自动修改项目。此项是当前配置和已知漏洞库的技术复核，不保证将来依赖无漏洞，也不替代以下人工隐私与权利审查。
- [ ] 确认规则中的代码示例、文档截图和适配器模板没有暴露不宜公开的信息。

## 发布决策与验收

- [x] 所有者明确确认当前规则正文、历史归档和可达 Git 历史可公开，并授权仓库改为 Public（本次对话）。公开将同时使既有 GitHub Actions 历史与日志可见；开发代理未把机器扫描等同于内容授权。
- [x] GitHub 仓库已按所有者授权改为 Public，并通过 GitHub API 核对可见性（2026-09-25）。
- [x] 用户确认已在 Codex 桌面端安装插件、审查 Hook 并作出是否信任的决定（本次对话）。尚未提供桌面端版本、测试工程、四个 Skills 的逐项试用结果或 Hook 信任选择，详细结果仍须在[桌面端验收记录](codex-desktop-acceptance.md)中补充，不得声称开发代理亲自观察到这些行为。

- [x] 四个 Codex Skills 已用 Codex 内置 `skill-creator/scripts/quick_validate.py` 完成一次本地格式校验（2026-09-24）；Codex 内置 `plugin-creator/scripts/validate_plugin.py` 对插件 manifest、Skills 等完成本地校验（2026-09-24）。`npm run check` 持续检查仓库内插件入口、Skill 基本结构、Hook 声明及行为。上述校验不等同于实际安装验收。
- [x] [CI 临时运行器](https://github.com/yadan177/AgentRuleKit/actions/runs/35995283037)使用 Codex CLI `0.142.0` 添加本仓库 Marketplace、安装插件并核对启用状态（2026-09-24）；此项只验证 CLI 安装链路，不验证桌面端交互或 Hook 信任。
- [x] 在隔离的 Codex CLI `0.142.0` 环境中添加本地 Marketplace 并安装插件；`codex debug prompt-input` 确认四个 Skills 可发现，安装缓存中的 SessionStart Hook 脚本在模拟 Release 响应下可运行。此项由 `scripts/verify-codex-plugin-install.mjs` 复测，不等同于 Codex 会话实际调度 Hook。
- [x] 在独立临时 `CODEX_HOME` 中从公开的 `yadan177/AgentRuleKit` GitHub 仓库添加 Marketplace 并安装 `agent-rule-kit@agentrulekit` `0.1.0`；`codex plugin list` 确认来源，安装缓存含四个 Skills 和 Hook，`codex debug prompt-input` 确认四个 Skills 可发现（2026-09-25）。这不等同于桌面端交互或 Hook 信任验收。
- [x] CLI 已用模拟 GitHub Release 完成 `init/check/diff/update --apply/validate` 命令级闭环，并验证摘要错误不会修改业务项目；这项模拟测试本身不代表真实远端验收，真实 `v0.1.0` 结果见下一项。
- [x] `v0.1.0` GitHub Release 已发布：资产 `agentrulekit-rulepacks.tar.gz` 的 API SHA-256、实际下载内容和来源提交 `09567ea` 已核对；本地打包安装的 CLI 在全新临时 TypeScript 工程从真实 Release 完成 `init/validate/check/diff/update --apply`，同版本没有待更新文件。npm 独立安装和后续跨版本证据分别见下方条目。
- [x] `npm run smoke:public` 又在全新 Go、TypeScript、Unity 临时工程从真实公开 Release 运行 `init/validate/check/diff/update --apply`，核对 GitHub 来源、版本、摘要与来源提交一致，确认同版本应用后锁文件不变（2026-09-25）。CLI 仍来自本地 tarball，不等同于 npm 注册表安装或正式跨版本更新。
- [x] 仓库所有者启用 npm 账户 2FA 后，已从固定的 `v0.1.0` 标签首次发布公开包 [`agentrulekit@0.1.0`](https://www.npmjs.com/package/agentrulekit)（2026-09-25）。npm 注册表返回的版本、`agent-rule` 命令入口与 SHA-512 integrity 均已核对；在隔离目录从 npm 注册表全新安装，Go、TypeScript、Unity 临时工程均通过 `detect/init/validate/check/diff/update --apply/validate`，同版本无待更新文件且锁文件哈希不变。包级 README 是首发标签之后加入主分支的，未包含在 `0.1.0` 包中。
- [x] [`v0.1.1` 标签 CI](https://github.com/yadan177/AgentRuleKit/actions/runs/36104809030)在 Linux、macOS、Windows 的 Node.js 22/24 及插件/规则文档检查均通过后发布 GitHub Release；规则包摘要 `sha256:ac5587543b5606b0ab2f051180d3216b7aa4a78224fe59a132e1e3a624efcabb` 与来源提交 `edcf84789d6bc461d2757f1230f0b83be2316e0d` 已核对。
- [x] [`v0.1.1` npm 发布工作流](https://github.com/yadan177/AgentRuleKit/actions/runs/36104950806)从同一标签通过 Trusted Publisher/OIDC 发布 `agentrulekit@0.1.1`，日志显示签名 provenance；注册表返回 `agent-rule` 入口、SHA-512 integrity 和 provenance attestation。公开包含中文包级 README；独立安装后 Go、TypeScript、Unity 的同版本联网验收通过。
- [x] [`v0.1.2` 标签 CI](https://github.com/yadan177/AgentRuleKit/actions/runs/36221072094)在 Linux、macOS、Windows 的 Node.js 22/24 及插件/规则文档检查均通过后发布 [GitHub Release](https://github.com/yadan177/AgentRuleKit/releases/tag/v0.1.2)；真实资产的摘要、来源提交与 `LICENSE` 已核对。本地打包 CLI 在 Go、TypeScript、Unity 临时工程完成同版本公开 Release 验收。
- [x] [`v0.1.2` npm 发布工作流](https://github.com/yadan177/AgentRuleKit/actions/runs/36221196693)从同一标签通过 Trusted Publisher/OIDC 发布 `agentrulekit@0.1.2`；npm 注册表返回命令入口、integrity 与 provenance attestation。独立从注册表安装的 CLI 在 Go、TypeScript、Unity 临时工程完成同版本联网验收。四个 Codex Skills 和插件另外通过本机官方校验脚本；这不等同于桌面端实际调用验收。
- [ ] 按[Codex 桌面端验收记录](codex-desktop-acceptance.md)补齐四个 Skills 的逐项试用、Hook 信任选择及实际会话调度结果。用户的概括性确认与 CLI 隔离验收均不能替代这些细节。
- [x] 仓库所有者明确确认公开范围并同意设为 Public；具体来源证据仍由内容提供方负责保存或后续补录。
- [x] 从 npm 独立安装 `0.1.0` CLI 的 Go、TypeScript、Unity 临时工程，完成真实 `0.1.0 → 0.1.1` 的 `check`（退出码 3）、`diff`（显示通用规则正文且文件哈希不变）、`update --apply`、`validate/check/diff`（无待更新），重复应用后锁文件哈希不变。另在固定真实 `v0.1.0` Release 的临时工程手动运行 Hook：真实 GitHub 元数据触发提醒、缓存摘要与新 Release 一致，更新后不再提醒且 Hook 不改锁文件。此项不等同于 Codex 桌面端实际调度 Hook。
- [x] 已在 npm 包设置中配置 GitHub Actions 可信发布者；`npm trust list agentrulekit` 返回 `yadan177/AgentRuleKit`、`publish-npm.yml` 以及 `publish, stage publish` 权限（2026-09-25）。
- [x] 已在 `v0.1.1` 标签上验收 OIDC 发布及 npm provenance；`0.1.0` 未重发。
- [x] README 已分别说明公开 GitHub Release 与 npm CLI 可用，并保留桌面端验收的边界。
