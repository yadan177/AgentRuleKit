# 公开发布前审查清单

当前决定：仓库保持 **Private**，继续审查。草稿 PR 与 CI 仅用于内部验证；不得据此将仓库改为 Public、推送发布标签或发布 npm 包。

已完成的机器筛查范围、结果和限制见 [2026-09-24 自动筛查记录](publication-audit-2026-09-24.md)。[逐文件来源索引](rulepack-provenance-inventory.md)与[内容权利复核表](content-rights-review.md)用于人工审查；机器筛查不代替下面的人工授权确认。

## 内容与授权

- [ ] 逐项确认 `rulepacks/` 中的规则、示例和引用材料的来源、作者及可公开分发权限。
- [ ] 优先核对[上游许可线索与具体待核位置](content-rights-review.md#上游许可线索与优先复核项2026-09-24)中的 Java P3C、Uber Go 引用和未定位的 Go API 源材料，再覆盖其余没有显式来源声明的规则。
- [ ] 对照[历史归档逐文件清单](legacy-archive-inventory.md)单独检查 `archive/legacy-rules/`：虽不参与安装，但公开仓库仍会公开其当前内容及 Git 历史。确定是保留、移出公开仓库，还是先取得授权。哈希相同不能代替权利判断。
- [ ] 核对 `LICENSE` 的 Apache-2.0 声明是否适用于准备公开的全部自有内容；第三方内容按原许可处理。必要时请权利人或法务确认。

## 安全与隐私

- [ ] 审查当前文件和完整 Git 历史中的凭据、个人信息、内部域名、客户资料、私有项目名及可追溯的业务代码；模式扫描只能辅助，不能替代人工审查。
- [ ] 复核依赖、GitHub Actions 权限、Release 资产验证与插件 Hook 的联网行为。
- [ ] 确认示例工程、文档截图和规则模板没有暴露不宜公开的信息。

## 发布决策与验收

- [x] 四个 Codex Skills 已用 Codex 内置 `skill-creator/scripts/quick_validate.py` 完成一次本地格式校验（2026-09-24）；Codex 内置 `plugin-creator/scripts/validate_plugin.py` 对插件 manifest、Skills 等完成本地校验（2026-09-24）。`npm run check` 持续检查仓库内插件入口、Skill 基本结构、Hook 声明及行为。上述校验不等同于实际安装验收。
- [x] [CI 临时运行器](https://github.com/yadan177/AgentRuleKit/actions/runs/35995283037)使用 Codex CLI `0.142.0` 添加本仓库 Marketplace、安装插件并核对启用状态（2026-09-24）；此项只验证 CLI 安装链路，不验证桌面端交互或 Hook 信任。
- [x] 在隔离的 Codex CLI `0.142.0` 环境中添加本地 Marketplace 并安装插件；`codex debug prompt-input` 确认四个 Skills 可发现，安装缓存中的 SessionStart Hook 脚本在模拟 Release 响应下可运行。此项由 `scripts/verify-codex-plugin-install.mjs` 复测，不等同于 Codex 会话实际调度 Hook。
- [x] CLI 已用模拟 GitHub Release 完成 `init/check/diff/update --apply/validate` 命令级闭环，并验证摘要错误不会修改业务项目；真实 Release 尚未创建，不能据此勾选外部环境验收。
- [ ] 在 Codex 桌面端确认插件可安装、四个 Skills 可使用，并由用户审查和信任 Hook 后验证会话启动检查。上述 CLI 验收不能替代桌面端交互与信任授权。
- [ ] 仓库所有者明确确认公开范围与许可证，再决定是否把仓库设为 Public。
- [ ] 公开后按 [发布说明](releasing.md) 依次验证 Release 资产、npm 包名所有权、独立环境安装与远程更新闭环。
- [ ] 在完成上述确认前，README 保持“本地已实现、尚未公开发布”的状态说明。
