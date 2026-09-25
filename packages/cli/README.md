# AI开发工具箱 CLI（AgentRuleKit）

`agentrulekit` 为项目安装、检查和更新共享 AI 开发规则。规则正文固定在项目 Git 中；CLI 安装在个人电脑，Codex 插件可另行安装。当前首版适配 Codex，规则源本身不绑定编辑器。

需要 Node.js 22 或更高版本，以及访问 GitHub Release 的网络。安装后先在测试工程试用：

```bash
npm install -g agentrulekit
agent-rule detect /absolute/path/to/project
agent-rule init /absolute/path/to/project
agent-rule validate /absolute/path/to/project
```

`init` 会从正式 GitHub Release 下载匹配的规则包并校验 SHA-256，然后在工程中生成 `.agent-rules/`、`agent-rules.yaml`、`.agent-rules.lock.json` 和 Codex 的 `AGENTS.md` 入口。运行前请先用 `detect` 确认技术栈，并在安装后审查生成文件、提交到项目 Git。未知文件或已有受管内容冲突时会停止，不会静默覆盖。

更新由项目成员控制：

```bash
agent-rule check /absolute/path/to/project
agent-rule diff /absolute/path/to/project
agent-rule update /absolute/path/to/project --apply
agent-rule validate /absolute/path/to/project
```

`check` 和 `diff` 不修改工程；`update` 默认只预览，只有加 `--apply` 才写入。项目本地覆盖规则放在 `.agent-rules/overrides.md`，更新时会保留。请先审查差异，再决定是否应用并提交 Git。

完整说明、Codex 插件安装方法及恢复流程见 [AgentRuleKit 安装与更新文档](https://github.com/yadan177/AgentRuleKit/blob/main/docs/installation.md)。源码与问题反馈：[AgentRuleKit](https://github.com/yadan177/AgentRuleKit)。
