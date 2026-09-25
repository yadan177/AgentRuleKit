# 本地试用示例

在仓库根目录运行 `npm run demo:local`，脚本会创建独立的临时 TypeScript 工程和临时规则源，依次演示 `detect → init → validate → check → diff → update --apply → validate`。默认结束后清理临时目录；运行 `npm run demo:local -- --keep` 可保留演示工程供人工检查，之后请自行清理显示的具体临时目录。

演示不会访问 GitHub、安装个人 Codex 插件或修改真实业务工程。它通过改变临时规则源的内容模拟一次本地更新，**不模拟正式 GitHub Release 的版本发布**；完整的远程发布与更新仍待公开发布后的验收。

[`codex-typescript/agent-rules.yaml`](codex-typescript/agent-rules.yaml) 仅展示配置格式；其中 `source.path: ../..` 只对本仓库内的该示例位置有意义，不能直接复制到其他项目。真实项目应由 CLI `init` 生成配置与锁文件。
