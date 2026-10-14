# 插件与技能：用户环境安装器

本页描述桌面版 `1.2.1` 的用户环境安装器；正式包交互验收见[验收记录](desktop-1.2.1-acceptance.md)。Codex 的安装与识别流程已验证；TraeWork 本地 Skill 为实验支持，客户端识别和实际任务仍待验收。

## 使用流程

进入“插件与技能” → 导入已下载的插件包或独立 Skill 文件夹 → 选择目标软件 → 预览文件变化 → 确认安装。安装无需项目或技术栈。随后在“已安装”中选择导入的更新版本，预览更新；卸载也先预览，只清理工具箱登记且未漂移的内容。

插件源支持根级 `plugin.json` 或兼容的 `.codex-plugin/plugin.json`。独立 Skill 使用根级 `SKILL.md`，必须有有效的 `name` 与 `description`；可通过 `metadata.version` 声明版本，没有版本时按内容摘要生成独立版本。每次导入保留完整文件快照、许可、来源和摘要；源脚本在导入时不执行。

| 内容与目标 | 当前实现 | 检查方式 |
| --- | --- | --- |
| 独立 Skill → Codex | 安装到软件用户的 `~/.agents/skills/<name>/`；旧 `~/.codex/skills/` 的同名内容会阻止重复安装。 | 校验文件摘要及权限；有可用 CLI 时通过只读 `skills/list` 核对用户级识别，未启动模型任务或新聊天。实际调用另行验收。 |
| 原生插件 → Codex | 在工具箱用户数据中建立独立个人市场，由官方 `codex plugin marketplace add`、`plugin add` 安装。更新仍调用官方 CLI；卸载调用 `plugin remove` 并移除该插件的工具箱市场。 | 核对宿主安装身份、来源、版本、启用状态及缓存文件；工具连接、Hook 信任和任务运行仍由 Codex 完成。 |
| 独立 Skill → TraeWork | 安装到软件用户的 `~/.trae-cn/skills/<name>/`，仅支持本地任务。 | 校验本地文件；客户端识别与实际调用另行验收。 |
| Product Design `0.1.56` → TraeWork | 复用已有适配器，安装 `toolbox-product-design` 入口与完整本机源快照，也保留 ZIP 导出。 | 单个入口读取十个源工作流；不代表十个独立已注册 Skills，也不代表原生插件兼容。 |
| 其他插件 → TraeWork | 尚无原生插件交付，明确标为不支持。 | 不删除或忽略 MCP／Hook 来冒充兼容。 |

Codex CLI 优先发现桌面应用附带的可执行文件，再检查 PATH 和 npm 原生二进制。找不到支持插件命令的版本时给出错误，不自动安装或修复用户的 Codex。

官方依据：[Codex 本地 Skills](https://learn.chatgpt.com/docs/build-skills)、[Codex 插件与个人市场](https://developers.openai.com/plugins/build/plugins)、[TraeWork Skills](https://docs.trae.cn/work_skills)。[TRAE 官方迁移说明](https://docs.trae.cn/work_traework-to-traecode-data-migration?lang=zh)已说明 TraeWork 与 TraeCode 的融合升级；本实现保留已记录的 TraeWork 本地路径，新 TRAE 的路径、插件格式和实际运行需单独核对，不自动改动现有 TraeWork 数据。

## 写入与记录

- 安装记录保存在工具箱用户数据的 `ide-assets/receipts/`，分别记录软件、来源版本、目标目录、受管文件摘要和 Codex 宿主缓存。
- 预览与应用分别重新检查文件、来源和安装记录。未知目录、同名安装、受管漂移、链接、越界路径或过期预览会阻止写入。
- 更新保留未知文件；新增路径撞到未知内容时拒绝覆盖。卸载不需要原导入源；独立 Skill 可离线卸载，Codex 插件卸载依赖可用的官方 CLI。操作不删除项目规则、其他插件和用户文件。
- 文件操作使用暂存目录、备份和操作锁；正常异常会回退文件及安装记录，并尝试回退 Codex 宿主安装。进程强制终止后遗留操作锁需人工核对备份与宿主状态，当前尚无自动中断恢复入口。
- 导入源保留脚本权限，Windows 的权限处理遵循其文件系统。软件安装状态与“运行过真实任务”分别记录，当前不会把文件校验或 CLI 注册称为实际任务验收。

## 开发验证

```bash
npm run check
npm run typecheck --workspace agentrulekit-desktop
```

本机有可用 Codex CLI 时，设置 `AGENTRULEKIT_CODEX_CLI` 为其绝对路径再运行检查，可运行真实 CLI 的隔离安装、更新、缓存漂移拒绝和卸载测试。测试使用临时用户目录，不修改用户的真实 Codex 配置。未设置该测试变量时，此项显式跳过；其余文件生命周期测试照常运行。

开发版可设置 `AGENTRULEKIT_DEV_PROFILE` 为临时绝对目录，启动独立验证窗口；规则状态、导入库和插件／Skill 的目标用户环境均放在该验证目录中。该开关只在非打包开发模式生效。
