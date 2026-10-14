# AI 开发工具箱桌面版

本次桌面版本是 [1.2.2](https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.2.2)，验收见[验收记录](../../docs/desktop-1.2.2-acceptance.md)。Mac 和 Windows 均在启动时检查新版，发现后显示提示，并由用户下载、手动安装。桌面版和规则包分别发布，npm CLI 与规则包仍是 `0.1.5`。

桌面版 1.1.0 面向 macOS 和 Windows，提供安装、更新和卸载项目规则。选择项目文件夹后，安装时选 Unity、JS + TS、Java、Go 或 Python，并可多选 Codex、Qoder、Cursor、WorkBuddy。一次安装会包括该技术栈的开发规则及对应文档规则；所选平台共用 `.agent-rules/` 和 `AGENTS.md`，不会复制多套正文。Qoder、Cursor、WorkBuddy 的真实客户端加载仍待验收。

1.2.1 将“我的项目”“项目规则”“插件与技能”分为三个独立页面，默认打开“我的项目”。添加项目后保留在列表，点击“管理规则”进入对应项目的规则操作。界面删除段落式说明，仅显示操作、状态、必要错误和变更内容。

1.2.2 的“项目规则”通过自定义下拉框选择“我的项目”中登记的项目；项目添加和移出列表在“我的项目”操作。项目选项显示名称和完整路径，路径不可用时禁止选择。“安装到”和“更新来源”也使用同一个下拉组件，支持方向键、首尾定位、输入名称定位、确认与取消。

1.2.0 增加了独立项目列表：工具箱把项目路径保存在个人应用数据目录中；选择已有项目时只读取它的规则状态，不重新初始化或改写项目。列表中的「移出列表」仅删除工具箱记录，项目规则继续保留。“插件与技能”模块支持导入本机插件或独立 Skill，选择 Codex／TraeWork 后预览安装，并查看已安装内容、预览更新和卸载。具体兼容范围与验收见[用户环境安装器](../../docs/user-asset-installation.md)。TraeWork 本地 Skill 标为实验支持，客户端识别和真实任务仍待验收。
桌面应用只保留一个运行实例，避免两个窗口进程同时修改项目列表造成记录丢失。

## Product Design 迁移实验

“插件与技能”页点击「导入」，选择本机插件缓存中的包根目录，检查来源与许可后确认。完整源包只复制到应用个人数据目录 `plugin-imports/<name>@<version>/source/`；`import.json` 保存来源与文件哈希。导入不执行源脚本，不覆盖已有版本，导出前重新核对快照完整性。

当前仅为 Product Design `0.1.56` 提供 TraeWork 适配。点击「导出 TraeWork 技能包」生成根级 `SKILL.md` 的 ZIP，再在 TraeWork「插件市场 → 技能 → 上传技能」安装。TraeWork 识别一个入口 Skill，按任务读取保留的 10 个源 Skills；导出不等于安装或验证完成。MCP/Hook 等声明不能被静默忽略；其他包可保存来源，暂不提供交付。原包为专有许可，本次不将原文放入公开仓库。完整边界与验收见[迁移实验](../../docs/product-design-traework-experiment.md)。

[下载桌面版 1.2.2](https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.2.2)：macOS Apple Silicon 使用 DMG，Windows x64 使用 EXE。已发布的 npm CLI `0.1.5` 不支持多平台配置；桌面版创建的多平台项目目前请继续用桌面版管理。

安装和卸载都会先显示文件预览，再由用户点击确认。更新已有规则时，选择已安装项目，也可直接调整所选平台；点击「检查更新」后，若有规则新版本或平台选择变化，再点击「查看变更」，逐文件审查并确认更新。检查更新只读取 GitHub Release 信息；查看变更才下载规则包并校验摘要。更新与卸载都会保留 `.agent-rules/overrides.md` 和其他项目自有文件。若文件已漂移、配置变化或存在冲突，应用会停止写入。

`1.1.0` 新增软件自身更新提醒：每次启动后检查 `desktop-v*` Release；只有发现新版时才在顶部显示提示。点击提示会在浏览器打开对应平台的安装包下载地址，下载后由用户手动安装。它不改项目规则、CLI 或个人 Codex 中的旧插件副本。`1.0.0` 没有软件更新提醒，升级到 `1.1.0` 需自行下载并安装。Windows 应用内自动安装仍需签名与跨版本验收。

## 开发和打包

在仓库根目录运行：

```bash
npm install
npm run typecheck --workspace agentrulekit-desktop
npm test --workspace agentrulekit-desktop
npm run pack:mac --workspace agentrulekit-desktop
npm run pack:win --workspace agentrulekit-desktop
```

本机构建输出 `release/AgentRuleKit-Desktop-1.2.2-macOS-arm64.dmg`，或 `release/AgentRuleKit-Desktop-1.2.2-Windows-x64.exe`。在对应操作系统上构建；GitHub Actions 的 `桌面应用安装包` 工作流分别使用 macOS 与 Windows 运行器。本次发布只有 DMG 和 EXE，没有 Windows 自动更新清单。Mac DMG 不签名、不公证，用户首次打开时可能需要在系统「隐私与安全性」中允许打开；Windows EXE 未签名，系统可能显示未知发布者提示。桌面应用本身不会卸载电脑上的 CLI 或个人 Codex 中的旧插件副本。

## 已完成的本机验证

在一个已有本地覆盖规则的 Unity 测试工程中，通过打包后的 `.app` 预览并安装 Unity + Codex 规则，CLI `validate` 通过；随后在同一应用内预览并卸载。卸载后，项目 Git 状态、保留文件和原有改动均与测试前一致。1.1.0 的 Mac 和 Windows CI 已完成代码检查与安装包构建；Windows 真实桌面交互及本版跨版本更新提醒仍待验收。其他客户端的规则加载也仍待验收。
