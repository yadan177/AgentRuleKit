# AI 开发工具箱桌面版

仓库正在开发桌面版 `1.1.0`；当前已发布版仍是 [1.0.0](https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.0.0)。Windows 软件内自动安装更新须在签名和跨版本验收后才能发布；Mac 采用新版提醒与手动安装。桌面版和规则包分别发布，npm CLI 与规则包仍是 `0.1.5`。

桌面版 1.0.0 面向 macOS 和 Windows，提供安装、更新和卸载项目规则。选择项目文件夹后，安装时选 Unity、JS + TS、Java、Go 或 Python，并可多选 Codex、Qoder、Cursor、WorkBuddy。一次安装会包括该技术栈的开发规则及对应文档规则；所选平台共用 `.agent-rules/` 和 `AGENTS.md`，不会复制多套正文。Qoder、Cursor、WorkBuddy 的真实客户端加载仍待验收。

[下载桌面版 1.0.0](https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.0.0)。已发布的 npm CLI `0.1.5` 不支持多平台配置；桌面版创建的多平台项目目前请继续用桌面版管理。

安装和卸载都会先显示文件预览，再由用户点击确认。更新已有规则时，选择已安装项目，也可直接调整所选平台；点击「检查更新」后，若有规则新版本或平台选择变化，再点击「查看变更」，逐文件审查并确认更新。检查更新只读取 GitHub Release 信息；查看变更才下载规则包并校验摘要。更新与卸载都会保留 `.agent-rules/overrides.md` 和其他项目自有文件。若文件已漂移、配置变化或存在冲突，应用会停止写入。

`1.1.0` 源码新增软件自身更新：每次启动后检查 `desktop-v*` Release；只有发现新版时才在顶部显示提示。Mac 点击提示后在浏览器下载 DMG，用户打开安装包并手动替换旧版；Mac 不在应用内下载或自动安装。Windows 的已签名版本点击提示后在应用内下载，下载完成即安装并重新打开；如果正在操作项目规则，须等操作结束后再点击「重启完成更新」。它不改项目规则、CLI 或 Codex 插件。Windows 安装包签名校验未通过时只能从发布页手动安装。1.0.0 没有软件更新能力，因此升级到首个有提醒功能的版本需手动安装一次。

## 开发和打包

在仓库根目录运行：

```bash
npm install
npm run typecheck --workspace agentrulekit-desktop
npm test --workspace agentrulekit-desktop
npm run pack:mac --workspace agentrulekit-desktop
npm run pack:win --workspace agentrulekit-desktop
```

本机构建输出 `release/AgentRuleKit-Desktop-1.1.0-macOS-arm64.dmg`，或 `release/AgentRuleKit-Desktop-1.1.0-Windows-x64.exe` 与 `latest.yml`。在对应操作系统上构建；GitHub Actions 的 `桌面应用安装包` 工作流分别使用 macOS 与 Windows 运行器。Mac DMG 不签名、不公证，用户首次打开时可能需要在系统「隐私与安全性」中允许打开；这一点会影响首次安装体验。`desktop-v*` 发布工作流要求 Windows Authenticode 签名并核对更新清单；Windows 签名材料只放在 GitHub Actions Secrets：`WIN_CSC_LINK`、`WIN_CSC_KEY_PASSWORD`。桌面应用本身不会卸载电脑上的 CLI 或 Codex 插件。

## 已完成的本机验证

在一个已有本地覆盖规则的 Unity 测试工程中，通过打包后的 `.app` 预览并安装 Unity + Codex 规则，CLI `validate` 通过；随后在同一应用内预览并卸载。卸载后，项目 Git 状态、保留文件和原有改动均与测试前一致。此前 1.0.0 的 Windows CI 已完成代码测试和安装包构建；1.1.0 的 Windows 签名打包、跨版本自动安装与真实桌面交互仍待验收。其他客户端的规则加载也仍待验收。
