# AI 开发工具箱桌面版

最新已发布版是 [1.1.0](https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.1.0)。Mac 和 Windows 均在启动时检查新版，发现后显示提示，并由用户下载、手动安装。桌面版和规则包分别发布，npm CLI 与规则包仍是 `0.1.5`。

桌面版 1.1.0 面向 macOS 和 Windows，提供安装、更新和卸载项目规则。选择项目文件夹后，安装时选 Unity、JS + TS、Java、Go 或 Python，并可多选 Codex、Qoder、Cursor、WorkBuddy。一次安装会包括该技术栈的开发规则及对应文档规则；所选平台共用 `.agent-rules/` 和 `AGENTS.md`，不会复制多套正文。Qoder、Cursor、WorkBuddy 的真实客户端加载仍待验收。

[下载桌面版 1.1.0](https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.1.0)：macOS Apple Silicon 使用 DMG，Windows x64 使用 EXE。已发布的 npm CLI `0.1.5` 不支持多平台配置；桌面版创建的多平台项目目前请继续用桌面版管理。

安装和卸载都会先显示文件预览，再由用户点击确认。更新已有规则时，选择已安装项目，也可直接调整所选平台；点击「检查更新」后，若有规则新版本或平台选择变化，再点击「查看变更」，逐文件审查并确认更新。检查更新只读取 GitHub Release 信息；查看变更才下载规则包并校验摘要。更新与卸载都会保留 `.agent-rules/overrides.md` 和其他项目自有文件。若文件已漂移、配置变化或存在冲突，应用会停止写入。

`1.1.0` 新增软件自身更新提醒：每次启动后检查 `desktop-v*` Release；只有发现新版时才在顶部显示提示。点击提示会在浏览器打开对应平台的安装包下载地址，下载后由用户手动安装。它不改项目规则、CLI 或 Codex 插件。`1.0.0` 没有软件更新提醒，升级到 `1.1.0` 需自行下载并安装。Windows 应用内自动安装仍需签名与跨版本验收。

## 开发和打包

在仓库根目录运行：

```bash
npm install
npm run typecheck --workspace agentrulekit-desktop
npm test --workspace agentrulekit-desktop
npm run pack:mac --workspace agentrulekit-desktop
npm run pack:win --workspace agentrulekit-desktop
```

本机构建输出 `release/AgentRuleKit-Desktop-1.1.0-macOS-arm64.dmg`，或 `release/AgentRuleKit-Desktop-1.1.0-Windows-x64.exe`。在对应操作系统上构建；GitHub Actions 的 `桌面应用安装包` 工作流分别使用 macOS 与 Windows 运行器。本次发布只有 DMG 和 EXE，没有 Windows 自动更新清单。Mac DMG 不签名、不公证，用户首次打开时可能需要在系统「隐私与安全性」中允许打开；Windows EXE 未签名，系统可能显示未知发布者提示。桌面应用本身不会卸载电脑上的 CLI 或 Codex 插件。

## 已完成的本机验证

在一个已有本地覆盖规则的 Unity 测试工程中，通过打包后的 `.app` 预览并安装 Unity + Codex 规则，CLI `validate` 通过；随后在同一应用内预览并卸载。卸载后，项目 Git 状态、保留文件和原有改动均与测试前一致。1.1.0 的 Mac 和 Windows CI 已完成代码检查与安装包构建；Windows 真实桌面交互及本版跨版本更新提醒仍待验收。其他客户端的规则加载也仍待验收。
