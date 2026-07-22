# PICO Unity SDK

## 🎯 核心编写原则

> 本文档是 TRAE / Cursor / Copilot 等 AI 编码工具的 **PICO Unity SDK 选型专用规则**——遇到 PICO VR 相关问题时，按本文档选择正确的实现路线再写代码。

### 三条核心编写原则

> 🔴 **原则 1 · 规则即决策**
> **AI 编程规则的本质，是将项目中的架构边界、业务约束与编码规范转化为机器可执行的决策规则，使 AI 输出的不只是能运行的代码，而是符合团队工程标准、可维护且可扩展的代码。**
>
> - 每条规则都用 **❌ 不要 / ✅ 必须** 二元决策呈现——AI 不需要"看情况自己选"
> - 选型类规则给出**触发关键词 + 默认路线**对照表，AI 拿到关键词就能定位
> - 关键约束配 **Unity 内置工具 / 验证方式**（如 `XR Plugin Management` 窗口 / `Build Settings` / `Player.log`），AI 能直接落地

> 🟡 **原则 2 · 不要有 AI 幻觉**
> **AI 只能引用真实存在的 SDK 包名 / API / 版本号 / 源材料；不能杜撰、编造或推测。**
>
> - 涉及 SDK 名 / 包名 / API 时，只引用 PICO 官方文档（`developer.picoxr.com`）/ Unity 官方 XR 文档
> - 涉及版本号给"近期主流 LTS 版本"（如"Unity 2022 LTS"），不锁死小版本号
> - 不在文档里说"根据 PICO 官方推荐……"如果该来源其实没这么说——只说"行业惯例" / "通用做法"
> - 出现不确定时**显式标注**"按团队约定" / "视项目而定"，不掩盖不确定性

> 🟡 **原则 3 · 不要过度设计**
> **PICO 项目选型遵循"用户关键词决定路线，不要让用户选完路线再让他选技术栈"。**
>
> - 关键词命中哪条路线就直接给该路线的完整实现，不强行推"全套方案"
> - 第三方插件不引"看起来很全"的——按需引入（不需要混合现实就不要引 MR 插件）
> - 不写"未来可能用到"的预留代码（YAGNI）——`PICO Spatial` 项目不要预留 `PICO XR` 接口
> - 高级特性（空间锚点 / 手势识别 / 透视模式）只在用户明确要求时启用，且必须注释说明 *why*
> - 不要混用 SDK：选了 `PICO XR` 就别再让用户装 `PICO Spatial`，反之亦然

---

## 适用范围

- 处理任何与 `PICO Unity SDK` 相关的问题时，先判断用户走的是 `PICO Spatial`、`PICO XR` 还是 `Unity OpenXR` 路线，再给出实现步骤。
- 如果用户提到 `Project Swan`、空间应用、空间 UI、`Play-to-PICO` 或 `PICO Emulator`，默认走 `PICO Spatial` 路线。
- 如果用户提到沉浸式 XR、`PXR_Manager`、`PICO Integration`、混合现实能力或 `PICO XR plugin`，默认走 `PICO XR` 路线。
- 如果用户提到 `OpenXR Plugin`、`PICO XR Feature Group`、`Interaction Profiles` 或跨平台 OpenXR 集成，默认走 `Unity OpenXR` 路线。

## 模式选择

| 路线 | 定位 | 最低 Unity 版本 | 选择信号 |
|---|---|---|---|
| `PICO Spatial` | UI 优先、轻量级 3D、跨应用协作、空间化移动 App 工作流 | **Unity 6.0+** | 用户提到空间计算、空间 UI、`Play-to-PICO`、`PICO Emulator`、Project Swan |
| `PICO XR` | 高性能沉浸式体验、复杂 3D 场景、特效、物理、PICO 专属 XR/MR 能力 | **Unity 2021.3.26+** | 用户提到沉浸式 XR、`PXR_Manager`、`PICO Integration`、混合现实 |
| `Unity OpenXR` | 标准优先的 OpenXR 项目，关注跨平台交付，按需使用 PICO 扩展 | **Unity 2020.3.21+** | 用户提到 `OpenXR Plugin`、`PICO XR Feature Group`、`Interaction Profiles` |

- ⚠️ **不要把 `PICO Spatial` 描述为 `PICO XR` 的完全替代品**；二者的能力、文档来源、Unity 版本要求都不同。
- ⚠️ **Unity 2022 工程不能使用 PICO Spatial** —— 如果用户工程是 2022 且想用空间计算，建议改走 PICO XR 或先升级 Unity。

## 环境与版本

> **PICO 三种路线的最低 Unity 版本要求不同**。回答前请确认用户工程的 Unity 版本与目标路线。

### 路线与 Unity 版本对应表

| 路线 | 最低 Unity 版本 | 推荐 Unity 版本 | 设备范围 | 典型场景 |
|---|---|---|---|---|
| `PICO Spatial` | **Unity 6.0+** | Unity 6 (6000.0.59f2 / 6000.3.x) | Project Swan + PICO OS 6+ | 空间计算应用、跨应用协作、轻量 3D |
| `PICO XR` | **Unity 2021.3.26+** | Unity 2022 LTS | PICO Neo3 / PICO 4 / PICO 4 Ultra | 沉浸式 XR、复杂 3D 场景、特效、物理 |
| `Unity OpenXR` | **Unity 2020.3.21+** | Unity 2022 LTS | 任意 PICO 头显 | 跨平台 OpenXR 项目 |

### 回答前要确认

1. **设备型号**：PICO Neo3 / PICO 4 / PICO 4 Ultra / Project Swan 等
2. **PICO OS 版本**：不同 OS 版本对 SDK 兼容性差异大
3. **Unity 版本**：根据上表判断该路线是否可用
4. **目标模式**：PICO Spatial / PICO XR / Unity OpenXR 之一
5. **项目状态**：新建项目 vs 从已有项目迁移（迁移时要注意 SDK 升级路径）

### 前置依赖

无论哪条路线，都需要：
- `Android SDK & NDK Tools`（推荐 NDK 25.x 或 26.x）
- `OpenJDK 17`（Unity 2022.3+ 要求）
- `Android Build Support`（Unity Hub 装模块）
- `Meta XR Core SDK` / `PICO Unity Integration SDK`（按路线）

## 配置优先级

- 优先选择最短的可工作路径：环境配置 → 创建项目 → 导入 SDK → 选择或启用目标模式 → 运行 `Project Validation` → 集成能力 → 构建并运行。
- 对 `PICO Spatial`，通常引导用户进入 `PICO Unity SDK Portal`，选择 `PICO Spatial`，然后点击 `Apply All`。
- 对 `PICO XR`，通常要提醒用户启用 `PICO` 插件，并验证 `PXR_Manager`、`IL2CPP`、`ARM64` 以及 Graphics API 配置。
- 对 `Unity OpenXR`，通常要提醒用户启用 `OpenXR`、`PICO XR Feature Group`、相应的 `Interaction Profiles`，并运行 `Fix All`。
- 遇到构建失败、能力不可用或黄色警告时，建议先运行 `Project Validation` 或对应模式的配置检查，再推测原因。

## 能力边界

- 涉及 `Plane Detection`、`Environment Depth`、`Light Estimation`、透视、场景理解或空间网格时，先确认当前模式是否支持，再给出实现方案。
- 在 `PICO Spatial` 下，优先使用 `Spatial Input`、`Unity UI`、`XR Hands`、`XR Spatial Pointer Interactor` 以及受支持的 `AR Foundation` 子集。
- 对 `PICO XR` 和 `Unity OpenXR`，手柄输入、HMD 输入、混合现实能力与平台服务必须指向正确的文档路径，不要混用 API。
- 如果用户问某项能力是否在 Spatial 下可用，请先给出支持结论，再提供替代方案或模式切换建议。

## 调试与部署

- 对 `PICO Spatial`，优先使用 `Play-to-PICO` 和 `PICO Emulator`。
- 对 `PICO XR`，如果用户需要实时预览，推荐 `Live Preview` 或文档中提到的其他相关开发者工具。
- 对 `Unity OpenXR`，重点是确保 `OpenXR` 配置正确、示例场景就绪，并使用 `Build And Run` 部署到设备。
- 打包指引通常应包括：切换到 `Android`、添加场景、连接设备、选择 `Run Device`，然后执行 `Build And Run`。

## 回答格式

- 先给出推荐模式以及选择理由。
- 然后给出有序的实现步骤，必要时附带 Unity 菜单路径。
- 接着列出关键检查项，如 `IL2CPP`、`ARM64`、`World Space`、`OpenXR Plugin` 与 `PICO XR Feature Group`。
- 最后说明所选路线相关的模式限制、已知问题或常见坑。

## 避免事项

- 不要承诺某项功能在三条路线下都能用，除非文档明确支持。
- 不要把 `PICO XR` 的配置直接套到 `Unity OpenXR`，反之亦然。
- 不要忽略 `Full Space / Shared Space`、设备型号或操作系统版本限制。
- 不要只回答 API 名；务必包含编辑器路径、需要打开的开关与验证步骤。
