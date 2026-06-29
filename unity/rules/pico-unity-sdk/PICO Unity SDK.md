# PICO Unity SDK

## 适用范围

- 处理任何与 `PICO Unity SDK` 相关的问题时，先判断用户走的是 `PICO Spatial`、`PICO XR` 还是 `Unity OpenXR` 路线，再给出实现步骤。
- 如果用户提到 `Project Swan`、空间应用、空间 UI、`Play-to-PICO` 或 `PICO Emulator`，默认走 `PICO Spatial` 路线。
- 如果用户提到沉浸式 XR、`PXR_Manager`、`PICO Integration`、混合现实能力或 `PICO XR plugin`，默认走 `PICO XR` 路线。
- 如果用户提到 `OpenXR Plugin`、`PICO XR Feature Group`、`Interaction Profiles` 或跨平台 OpenXR 集成，默认走 `Unity OpenXR` 路线。

## 模式选择

- `PICO Spatial`：面向 UI 优先、轻量级 3D、跨应用协作以及空间化的移动 App 式工作流。
- `PICO XR`：面向高性能沉浸式体验、复杂 3D 场景、特效、物理以及 PICO 专属的 XR / MR 能力。
- `Unity OpenXR`：面向以标准为优先的 OpenXR 项目，关注跨平台交付，同时按需使用 PICO 扩展。
- 不要把 `PICO Spatial` 描述为 `PICO XR` 的完全替代品；二者的能力与文档来源都不同。

## 环境与版本

- 回答前先确认设备型号、操作系统版本、Unity 版本、目标模式，以及用户是新建项目还是从已有项目迁移。
- 对 `PICO Spatial`，重点关注 `Project Swan`、`PICO OS 6` 以及 `Unity 2022.3.62f2` 或 `Unity 6000.0.59f2`。
- 对 `PICO XR`，重点关注 `PICO Neo3 / PICO 4 / PICO 4 Ultra`、头显操作系统版本，以及 SDK 与 Unity 的兼容性（如 `Unity 2021.3.26+`）。
- 对 `Unity OpenXR`，重点关注 Windows 开发环境、`Unity 2020.3.21+`、`OpenXR Plugin` 与 `PICO XR Feature Group`。
- 给出步骤时，请明确列出前置依赖，如 `Android SDK & NDK Tools`、`OpenJDK` 与 `Android Build Support`。

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
