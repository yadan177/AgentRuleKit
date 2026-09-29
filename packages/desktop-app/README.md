# AI 开发工具箱桌面版

桌面版 1.0.0 面向 macOS 和 Windows，提供安装、更新和卸载项目规则。选择项目文件夹后，安装时选 Unity、JS + TS、Java、Go 或 Python，并可多选 Codex、Qoder、Cursor、WorkBuddy。一次安装会包括该技术栈的开发规则及对应文档规则；所选平台共用 `.agent-rules/` 和 `AGENTS.md`，不会复制多套正文。Qoder、Cursor、WorkBuddy 的真实客户端加载仍待验收。

安装和卸载都会先显示文件预览，再由用户点击确认。更新已有规则时，选择已安装项目，也可直接调整所选平台；点击「检查更新」后，若有规则新版本或平台选择变化，再点击「查看变更」，逐文件审查并确认更新。检查更新只读取 GitHub Release 信息；查看变更才下载规则包并校验摘要。更新与卸载都会保留 `.agent-rules/overrides.md` 和其他项目自有文件。若文件已漂移、配置变化或存在冲突，应用会停止写入。桌面版更新的是业务项目规则，不更新应用本身、CLI 或 Codex 插件。

## 开发和打包

在仓库根目录运行：

```bash
npm install
npm run typecheck --workspace agentrulekit-desktop
npm test --workspace agentrulekit-desktop
npm run pack:mac --workspace agentrulekit-desktop
npm run pack:win --workspace agentrulekit-desktop
```

Mac 包输出到 `release/AI开发工具箱-1.0.0-arm64.dmg`，Windows x64 包输出到 `release/AI开发工具箱-1.0.0-windows-x64.exe`。在对应操作系统上构建；GitHub Actions 的 `桌面应用安装包` 工作流分别使用 macOS 与 Windows 运行器。当前安装包未签名，Mac 包也未公证；安装时可能遇到系统安全提示。桌面应用本身不会卸载电脑上的 CLI 或 Codex 插件。

## 已完成的本机验证

在一个已有本地覆盖规则的 Unity 测试工程中，通过打包后的 `.app` 预览并安装 Unity + Codex 规则，CLI `validate` 通过；随后在同一应用内预览并卸载。卸载后，项目 Git 状态、保留文件和原有改动均与测试前一致。Windows 安装包及真实客户端加载需分别验收，不能仅凭打包通过宣称完成。
