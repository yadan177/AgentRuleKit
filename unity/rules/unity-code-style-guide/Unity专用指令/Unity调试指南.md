---
description: Unity MCP 调试指南——通过 Model Context Protocol 调试 Unity 工程
applyTo: "**/*.cs"
---

# Unity 调试指南

本指南介绍如何通过 Model Context Protocol（MCP）在 TRAE 等 AI IDE 中调试 Unity 工程。

## 目录

- [MCP 调试工作流概览](#mcp-调试工作流概览)
- [启用 Unity MCP 工具](#启用-unity-mcp-工具)
- [MCP 调试工具一览](#mcp-调试工具一览)
- [典型调试任务示例](#典型调试任务示例)
  - [任务 1：诊断编译错误](#任务-1诊断编译错误)
  - [任务 2：定位运行时 Null 引用异常](#任务-2定位运行时-null-引用异常)
  - [任务 3：使用断点进行逐步调试](#任务-3使用断点进行逐步调试)
  - [任务 4：检查内存分配](#任务-4检查内存分配)
  - [任务 5：监控帧率](#任务-5监控帧率)
- [MCP 调试工作流最佳实践](#mcp-调试工作流最佳实践)
- [常见问题与排查](#常见问题与排查)

---

## MCP 调试工作流概览

**Model Context Protocol（MCP）** 是 Anthropic 提出的一种标准协议，允许 AI 助手与外部工具建立结构化连接。通过 Unity MCP 集成，AI 助手可以直接访问 Unity Editor 内部状态，实时获取日志、调用栈、变量值、Profiler 数据等调试信息。

### 与传统调试方式相比

| 维度 | 传统调试 | MCP 调试 |
|------|----------|----------|
| 工具切换 | Unity Editor / Visual Studio / TRAE 频繁切换 | 在 TRAE 中直接查询并分析 |
| 信息获取 | 手动查看 Console、Profiler | AI 主动拉取并解读 |
| 诊断速度 | 依赖人工读日志 | AI 辅助分析、快速定位 |
| 上下文 | 需在 IDE 与 AI 间复制粘贴 | 同会话内完成 |

---

## 启用 Unity MCP 工具

MCP 服务列表、连接方式、可用工具均由 Unity Editor 侧 MCP 桥接决定。一般流程：

1. **在 Unity Editor 端安装并启用 MCP 桥接**
   - 通过 Unity Package Manager 或 Asset Store 搜索安装 Unity MCP 桥接。
   - 安装完成后，Unity Editor 启动时会暴露 MCP 端点（默认 `http://localhost:<port>/mcp`）。

2. **在 TRAE 中配置 MCP 端点**
   - TRAE → Settings → MCP → Add MCP Server。
   - 填入 Unity MCP 端点 URL（如 `http://localhost:7777/mcp`）并保存。

3. **在 TRAE 中确认可用工具**
   - 配置完成后，MCP 工具列表里会出现一组 `mcp__unity__*` 工具。
   - 工具的具体可用集合取决于 Unity MCP 桥接的版本与实现。

> 具体端点、工具名与字段以你安装的 Unity MCP 桥接版本为准。

---

## MCP 调试工具一览

下面给出一组常见的 `mcp__unity__*` 工具（具体名称以你的 MCP 桥接为准）：

| 工具名（示例） | 用途 | 典型使用场景 |
|----------------|------|--------------|
| `mcp__unity__get_console_logs` | 读取 Console 日志 | 编译错误、运行时异常 |
| `mcp__unity__clear_console_logs` | 清空 Console | 关注最近一次操作的输出 |
| `mcp__unity__get_editor_state` | 查询 Editor 当前状态 | 播放/暂停/构建目标 |
| `mcp__unity__execute_unity_command` | 在 Editor 上下文执行 C# 代码 | 反射访问内部对象 |
| `mcp__unity__get_active_scene_info` | 获取当前场景信息 | 对象数量、组件类型 |
| `mcp__unity__get_game_object` | 读取 GameObject 属性 | 位置、组件、字段值 |
| `mcp__unity__read_script` | 读取 .cs 文件源码 | 关联到堆栈时查看上下文 |
| `mcp__unity__get_profiler_stats` | 读取 Profiler 统计 | CPU、内存、渲染 |
| `mcp__unity__set_breakpoint` | 插入断点 | 在脚本中按行号下断点 |
| `mcp__unity__get_call_stack` | 获取当前调用栈 | 调试暂停时定位调用链 |

---

## 典型调试任务示例

### 任务 1：诊断编译错误

**场景**：刚刚改了 PlayerController.cs，Console 出现红字 "CS1003: Syntax error"。

**MCP 调试工作流**：
1. 触发 `mcp__unity__get_console_logs` 拉取最近的编译日志。
2. 解析错误行号与文件。
3. 用 `mcp__unity__read_script` 读取出错区域上下文。
4. 给出修复建议并改写代码。
5. 再次拉取日志确认 Console 已清空。

### 任务 2：定位运行时 Null 引用异常

**场景**：进入 Play 模式后某 NRE 反复出现，影响功能。

**MCP 调试工作流**：
1. `mcp__unity__get_console_logs` 拉取异常堆栈。
2. 在堆栈指向的 .cs 文件中下断点：`mcp__unity__set_breakpoint`。
3. 进入 Play 模式，命中断点后用 `mcp__unity__get_call_stack` 拉取调用链。
4. 用 `mcp__unity__get_game_object` 查看可疑 GameObject 的字段值。
5. 定位到问题根因后修复。
6. 退出 Play 模式后再次进入确认异常消失。

### 任务 3：使用断点进行逐步调试

**场景**：怀疑一个计算函数返回值不正确。

**MCP 调试工作流**：
1. 在可疑函数内下断点（多行）。
2. 进入 Play 模式触发调用。
3. 在每个断点处使用 `mcp__unity__get_call_stack`、读取相关局部变量（如果 MCP 桥接支持）。
4. 结合堆栈分析变量流转。
5. 找到分支错误，修复代码。
6. 清除断点，验证。

### 任务 4：检查内存分配

**场景**：怀疑 `Update()` 中存在每帧分配。

**MCP 调试工作流**：
1. `mcp__unity__get_profiler_stats` 抓取 GC.Alloc 计数。
2. 找到分配热点。
3. 在可疑代码处下断点。
4. 通过 `mcp__unity__execute_unity_command` 反射调用获取变量值。
5. 找出每帧分配源（如 `new` 列表/字符串）。
6. 重构为复用集合（参考[性能优化指南](Unity性能优化指南.md)）。
7. 重测 Profiler 统计确认分配消除。

### 任务 5：监控帧率

**场景**：发现游戏在某些场景帧率显著下降。

**MCP 调试工作流**：
1. `mcp__unity__get_profiler_stats` 拉取帧时间与 CPU。
2. 定位热点（脚本、渲染、GC）。
3. 借助 Profiler 工具链进一步定位（结合 `mcp__unity__execute_unity_command`）。
4. 应用优化后复测。

---

## MCP 调试工作流最佳实践

1. **先清空 Console，再触发场景**：避免被旧日志干扰。
2. **每次操作只改一处**：保证调试结论的因果清晰。
3. **结合断点 + 日志**：MCP 可拉取堆栈，断点提供确定性。
4. **遇到 Profiler 异常**：先看 GC、DrawCall，再看脚本 CPU 时间。
5. **修复后再次跑回归**：在改完一处后立即进入 Play 模式验证。
6. **保留调试上下文**：提交时移除 `Debug.Log`、测试性 MCP 触发与多余断点。

---

## 常见问题与排查

### MCP 工具未出现

- 确认 Unity Editor 已启动并保持运行。
- 检查 Unity MCP 桥接是否启用。
- 在 TRAE 的 MCP 设置里确认端点 URL 与端口正确。
- 重启 Unity Editor 与 TRAE。

### 拉取日志为空

- 确认刚刚执行了会触发日志的操作（编译、进入 Play 等）。
- Console 过滤器可能过滤掉了相关日志级别。
- 尝试 `mcp__unity__clear_console_logs` 后再触发一次。

### 断点未命中

- 确认目标脚本已在工程中编译通过。
- 确认函数确实被调用到。
- 检查 `mcp__unity__get_editor_state` 是否已处于 Play 模式（部分断点仅在 Play 模式生效）。

### Profiler 数据为空

- 必须在 Play 模式下采集（Editor 空闲时无 Profiler 帧）。
- 部分 MCP 桥接仅暴露统计快照，可能需要多次调用取差值。

### MCP 命令失败/超时

- 检查 Editor 是否卡在弹窗、编译或资产导入。
- 在 Unity Editor 主线程同步执行 MCP 命令，避免阻塞 Editor 调度。
- 看 `mcp__unity__get_editor_state` 的 `isCompiling` / `isPlaying` 等标志。

---

> **注意**：MCP 工具的具体可用集合、参数 schema 与端点 URL 取决于你安装的 Unity MCP 桥接版本与实现，请以你使用的版本为准。
