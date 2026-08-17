# 规则包

该目录是 AgentRuleKit 的唯一权威规则源。迁移前的原始目录已归档到 `archive/legacy-rules/`，不参与安装和日常维护。

每个可安装规则包必须包含 `pack.json`、一个入口文档，以及入口引用的任务专题规则。修改正文后需运行 `npm run manifests` 更新清单，并执行构建、测试和端到端安装验证。
