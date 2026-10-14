# Product Design → 工具箱 → TraeWork 迁移实验

## 目标与边界

使用本机已安装的 OpenAI Product Design `0.1.56`，验证工具箱管理外部设计能力并交付给 TraeWork 的真实路径。AI 开发工具箱仍是独立桌面平台。

Product Design 源包有 10 个 Skills 和共享引用、脚本、模板、图片。插件清单未声明 MCP 或 Hook，但任务仍依赖宿主的浏览器、图片生成、设计画布和发布工具。源包标注 `Proprietary`：本次原文只保存在用户本机，不纳入公开仓库；本次导入不构成公开再分发许可的判断。

[TraeWork 官方 Skill 文档](https://docs.trae.cn/work_skills)提供根级 `SKILL.md` 的 ZIP/`.skill` 上传，以及用户全局和项目范围。不能把用户全局安装误称为所有电脑账号共享，也不能据此宣称任意 Codex 原生插件可以直接运行。

## 实现

1. 桌面 IDE 页选择本机 Codex 插件根目录，预览身份、许可、Skills 和文件数量。
2. 将完整源包快照写到工具箱用户数据 `plugin-imports/<name>@<version>/source/`，独立记录来源与 SHA-256；不执行脚本，不覆盖已有版本。
3. 本次适配仅支持 Product Design `0.1.56`。未知版本或存在工具连接/Hook 声明的包保留来源，不宣称可交付。
4. 导出根级入口 `toolbox-product-design`，原包原文位于 `source/`，相对引用保持原结构；`provenance.json` 记录来源、适配器和“仅已导出”状态。
5. 经 TraeWork 官方上传界面安装到个人技能环境，在目标客户端测试调用。

TraeWork 识别的是 **1 个入口 Skill**，入口按任务读取原包的 **10 个源 Skills**，不是 10 个分别已注册的 TraeWork 技能，也不是原生 TraeWork 插件。适配层替换 Codex 浏览器 API、Codex 状态路径和 ChatGPT Work 的 Sites 运行假设；原任务流程和截图证据要求保留。插件的内置工具不会随文本导入。

## 本机验收（2026-10-02）

- 工具箱开发版通过真实 Electron 界面导入 Product Design：99 个文件、10 个 Skills，许可与作者展示正确。
- 通过工具箱界面导出 ZIP，TraeWork 官方上传界面已接受。
- TraeWork「管理 → 技能 → 个人」出现 `toolbox-product-design`，已启用；详情页可运行、禁用、卸载。
- 本机安装目录为 `~/.trae-cn/skills/toolbox-product-design/`，没有把包放进某个业务项目。
- 真实调用使用独立的本地测试工程与合成页面，测试 audit 工作流；结果在调用完成后记录。
- TypeScript 类型检查、`npm run check` 和官方 Skill 校验器通过。自动化测试覆盖完整快照/二进制/引用保留、预览过期、快照漂移、未知文件不覆盖、符号链接、路径逃逸与不支持的宿主依赖。

## 尚未覆盖

云端运行、ideate 图片生成、image-to-code/URL 完整原型、Figma 画布、部署分享，以及第二项目自动触发，都需要各自真实验收。桌面版 1.2.0 增加了应用级的预览安装、更新、卸载器；TraeWork 交付仍标为实验支持。自有设计能力插件库尚未实现，导出和安装均不改写项目规则。
