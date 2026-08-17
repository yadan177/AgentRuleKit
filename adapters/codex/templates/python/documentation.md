# 00 - Python 技术文档 Codex 入口规则

---

## 1. 任务路由

执行 Python 技术文档任务，或 Python 实现任务判断存在文档影响时，读取 `.agent-rules/project-docs/python/其他规则/04-PythonAI技术文档任务入口.md` 和 `.agent-rules/project-docs/python/其他规则/01-技术文档组织与维护规范.md`，再按总览选择专题规则。

## 2. 项目事实优先

- 🔴 必须检查 `pyproject.toml`、锁文件、模块、配置、迁移、契约、测试和部署。
- 🔴 不确定时标记待确认或询问用户。
- ❌ 禁止臆造框架、依赖、命令、接口、测试结果或项目架构。
