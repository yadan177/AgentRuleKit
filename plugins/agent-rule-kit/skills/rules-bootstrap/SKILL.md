---
name: rules-bootstrap
description: 通过检测技术栈、创建项目配置与 Codex 入口并验证生成结果，为软件工程初始化 AgentRuleKit。用户要求安装、引导、初始化或配置项目共享 AI 开发规则时使用。
---

# 规则初始化

通过 AgentRuleKit CLI 初始化目标工程，同时保留已有项目文件并报告技术栈检测证据。

## 执行流程

1. 确认目标工程根目录。用户指定其他工程时，不得默认使用当前目录。
2. 检查已有的 `agent-rules.yaml`、`.agent-rules/`、`.agent-rules.lock.json` 和 `AGENTS.md`。
3. 运行 `agent-rule detect <project-root>`，审查每个技术栈的检测证据。
4. 若 `agent-rules.yaml` 已存在，不得运行 `init`；审查现有配置后才能运行 `generate`。
5. 若工程尚未初始化，运行 `agent-rule init <project-root>`。
6. 运行 `agent-rule validate <project-root>`。
7. 报告检测到的技术栈、配置的规则包、生成文件、保留文件和验证结果。

## 安全边界

- 保留 `AGENTS.md` 中 AgentRuleKit 受控区块以外的全部内容。
- 不覆盖现有配置或边界不完整的受控区块。
- 将技术栈检测结果视为有证据的建议，而不是不可质疑的项目事实。
- 规则包 manifest 标记为 `ready` 前，明确说明其中尚无完成迁移的规则正文。
