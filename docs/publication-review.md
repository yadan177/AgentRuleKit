# 公开发布前审查清单

当前决定：仓库所有者已在本次对话中确认 `rulepacks/`、`archive/legacy-rules/` 和 Git 历史可以公开，并同意将仓库改为 **Public**。这是所有者的授权声明，不代表开发代理独立核实了每份材料的权属。GitHub Release 与 npm 发布仍须分别通过下述技术门槛；npm 账户认证和首次发布不能由此项授权推定已完成。

已完成的机器筛查范围、结果和限制见 [2026-09-24 自动筛查记录](publication-audit-2026-09-24.md)。[逐文件来源索引](rulepack-provenance-inventory.md)与[内容权利复核表](content-rights-review.md)用于人工审查；机器筛查不代替下面的人工授权确认。

## 内容与授权

所有者已确认公开范围；下列逐文件来源证据表仍未录入具体作者、许可与例外信息，不能把空白表格当作第三方权利证明。后续如需可审计的逐文件记录，继续按[内容权利复核表](content-rights-review.md)补齐。

- [ ] 逐项确认 `rulepacks/` 中的规则、示例和引用材料的来源、作者及可公开分发权限。
- [ ] 优先核对[上游许可线索与具体待核位置](content-rights-review.md#上游许可线索与优先复核项2026-09-24)中的 Java P3C、Uber Go 引用和未定位的 Go API 源材料，再覆盖其余没有显式来源声明的规则。
- [ ] 对照[历史归档逐文件清单](legacy-archive-inventory.md)单独检查 `archive/legacy-rules/`：虽不参与安装，但公开仓库仍会公开其当前内容及 Git 历史。确定是保留、移出公开仓库，还是先取得授权。哈希相同不能代替权利判断。
- [ ] 核对 `LICENSE` 的 Apache-2.0 声明是否适用于准备公开的全部自有内容；第三方内容按原许可处理。必要时请权利人或法务确认。

## 安全与隐私

- [x] 对分支快照 `40475ec` 的本地可达 Git 历史运行[脱敏模式复扫](publication-audit-2026-09-24.md#可达-git-历史模式复扫分支快照-40475ec)；1 处历史 Sentry 形式 URL 用户信息候选与 1 个提交元数据邮箱仍待人工判断。此项仅代表模式筛查完成，不代表下面的人工审查通过。
- [ ] 审查当前文件和完整 Git 历史中的凭据、个人信息、内部域名、客户资料、私有项目名及可追溯的业务代码；模式扫描只能辅助，不能替代人工审查。
- [ ] 复核依赖、GitHub Actions 权限、Release 资产验证与插件 Hook 的联网行为。
- [ ] 确认示例工程、文档截图和规则模板没有暴露不宜公开的信息。

## 发布决策与验收

- [x] 所有者明确确认当前规则正文、历史归档和可达 Git 历史可公开，并授权仓库改为 Public（本次对话）。公开将同时使既有 GitHub Actions 历史与日志可见；开发代理未把机器扫描等同于内容授权。
- [x] 用户确认已在 Codex 桌面端安装插件、审查 Hook 并作出是否信任的决定（本次对话）。尚未提供桌面端版本、测试工程、四个 Skills 的逐项试用结果或 Hook 信任选择，详细结果仍须在[桌面端验收记录](codex-desktop-acceptance.md)中补充，不得声称开发代理亲自观察到这些行为。

- [x] 四个 Codex Skills 已用 Codex 内置 `skill-creator/scripts/quick_validate.py` 完成一次本地格式校验（2026-09-24）；Codex 内置 `plugin-creator/scripts/validate_plugin.py` 对插件 manifest、Skills 等完成本地校验（2026-09-24）。`npm run check` 持续检查仓库内插件入口、Skill 基本结构、Hook 声明及行为。上述校验不等同于实际安装验收。
- [x] [CI 临时运行器](https://github.com/yadan177/AgentRuleKit/actions/runs/35995283037)使用 Codex CLI `0.142.0` 添加本仓库 Marketplace、安装插件并核对启用状态（2026-09-24）；此项只验证 CLI 安装链路，不验证桌面端交互或 Hook 信任。
- [x] 在隔离的 Codex CLI `0.142.0` 环境中添加本地 Marketplace 并安装插件；`codex debug prompt-input` 确认四个 Skills 可发现，安装缓存中的 SessionStart Hook 脚本在模拟 Release 响应下可运行。此项由 `scripts/verify-codex-plugin-install.mjs` 复测，不等同于 Codex 会话实际调度 Hook。
- [x] CLI 已用模拟 GitHub Release 完成 `init/check/diff/update --apply/validate` 命令级闭环，并验证摘要错误不会修改业务项目；真实 Release 尚未创建，不能据此勾选外部环境验收。
- [ ] 按[Codex 桌面端验收记录](codex-desktop-acceptance.md)补齐四个 Skills 的逐项试用、Hook 信任选择及实际会话调度结果。用户的概括性确认与 CLI 隔离验收均不能替代这些细节。
- [x] 仓库所有者明确确认公开范围并同意设为 Public；具体来源证据仍由内容提供方负责保存或后续补录。
- [ ] 公开后按 [发布说明](releasing.md) 依次验证 Release 资产、npm 包名所有权、独立环境安装与远程更新闭环。
- [ ] 在完成上述确认前，README 保持“本地已实现、尚未公开发布”的状态说明。
