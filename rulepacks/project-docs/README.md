# 项目技术文档规则包

项目技术文档规则按技术栈独立安装：

- `project-docs/python`
- `project-docs/go`
- `project-docs/java`
- `project-docs/js-ts`
- `project-docs/unity`

JavaScript 与 TypeScript 共用 `project-docs/js-ts`。CLI 根据检测到的开发技术栈自动选择对应文档规则包，并在配置中去重。
