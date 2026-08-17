# 00 - PICO Unity SDK 选型与维护规则

> - 🟢 本文件适用于 PICO 设备上的 Unity XR SDK 识别、能力选型、配置核对、迁移评估和设备验证。
> - 🔴 不适用：用关键词覆盖目标项目已经采用的 SDK，或把未经核验的 Unity/SDK/PICO OS 版本写成硬性事实。

---

## 1. 项目事实优先

处理 PICO 任务前，按以下顺序确认事实：

1. 用户当前目标和是否明确要求迁移 SDK。
2. `ProjectSettings/ProjectVersion.txt`、`Packages/manifest.json`、`packages-lock.json` 和本地 Package 引用。
3. XR Plug-in Management、Player Settings、OpenXR Feature、目标平台与构建脚本。
4. 现有命名空间、组件、Prefab、Scene 和平台条件编译所体现的 SDK 路线。
5. 目标设备、PICO OS、已安装 SDK 版本及项目已有真机验证记录。

- 🔴 项目已经选择并使用某条 SDK 路线时，必须沿用现有路线，除非用户明确授权迁移。
- 🔴 不得因为用户提到某个关键词就自动安装、替换或混用 SDK。
- 🔴 不得把 `Meta XR Core SDK` 写成 PICO 项目的共同依赖；只有目标项目确有独立 Meta 平台需求且已明确采用时才按其自身规则处理。

## 2. 候选路线识别

关键词只能帮助识别需要核对的候选路线，最终结论必须由项目依赖、设置和官方兼容资料共同确认。

| 候选路线 | 常见识别信号 | 必须核对 |
|---|---|---|
| PICO Spatial | Spatial、空间应用、Play-to-PICO、PICO Emulator | 项目实际 Package、目标设备、官方支持版本和能力边界 |
| PICO XR | PXR、PICO Unity Integration SDK、PICO 专属 XR/MR 能力 | 已安装 SDK、XR 管理设置、平台能力和目标设备 |
| Unity OpenXR + PICO 扩展 | OpenXR、PICO Feature、Interaction Profile、跨平台 | Unity OpenXR 版本、启用的 Feature、交互配置和 PICO 扩展 |

- 🔴 三条路线不是可随意互换的同义选项；API、能力、生命周期、迁移成本和验证范围不同。
- 🟡 新项目尚未选择路线时，依据目标设备、所需能力、跨平台目标、团队经验、长期维护和官方兼容矩阵提出候选方案，由用户或项目负责人确认。

## 3. 版本与来源记录

SDK、Unity、PICO OS 和设备兼容结论必须附官方来源与核验日期；无法从官方资料确认时标记待确认，不得写成最低版本或推荐版本的硬性事实。

| 来源 | 用途 | 本文件最近核验 |
|---|---|---|
| [PICO Developer - Unity](https://developer.picoxr.com/document/unity/) | PICO Unity SDK、功能与配置入口 | 2026-08-17 |
| [Unity XR Plug-in Management](https://docs.unity3d.com/Manual/com.unity.xr.management.html) | Unity XR 插件配置与版本对应入口 | 2026-08-17 |
| [Unity Android environment setup](https://docs.unity3d.com/Manual/android-sdksetup.html) | Editor 对应 Android SDK/NDK/JDK 工具链 | 2026-08-17 |

- 🔴 实施前必须重新核对与目标 SDK 版本对应的 release notes、兼容矩阵和设备/PICO OS 要求；本表日期不代表具体版本永久有效。
- 🔴 文档页面无法访问、版本映射不明确或本地 SDK 为厂商定制包时，必须记录证据缺口并通过包内文档、厂商支持或最小工程验证确认。

## 4. Android 工具链

- 🔴 优先检查目标 Unity Editor 通过 Unity Hub 安装并配置的 Android SDK、NDK、OpenJDK 和 Android Build Support。
- 🔴 只有项目明确使用外部工具链时才读取其路径和版本；不得用固定 NDK/JDK 版本覆盖 Editor 已验证组合。
- 🔴 修改 External Tools、Gradle、IL2CPP、ABI、Graphics API 或 Android Player Settings 前，检查现有构建脚本、CI 和目标设备约束。
- 🟡 ARM64、图形 API、权限和最低 Android API 等设置按 SDK 官方要求与目标项目事实逐项核对，不写成所有 PICO 项目的固定模板。

## 5. 配置与能力边界

- 🔴 只启用目标项目所需且当前 SDK/设备明确支持的 Feature、Interaction Profile、权限和平台服务。
- 🔴 Plane Detection、Environment Depth、透视、空间锚点、场景理解、手势或平台服务等能力，必须先确认当前路线、SDK、设备和 PICO OS 支持范围。
- 🔴 不得把 PICO XR 的组件、菜单路径或 API 套到 Unity OpenXR/PICO Spatial，反之亦然。
- 🔴 资源、订阅、回调、主线程分发和 SDK 会话必须有明确生命周期、取消和释放路径；非直观限制要与代码并行维护注释。

## 6. SDK 迁移

SDK 路线迁移属于高影响变更，未经明确授权不得执行。迁移前至少形成：

1. 当前与目标 SDK、Unity、设备和 PICO OS 的兼容证据。
2. Package、程序集、命名空间、Prefab/Scene、输入、权限和构建设置差异。
3. API/数据/资源迁移清单、回滚方式和分阶段提交边界。
4. Editor、Android 构建和目标 PICO 真机回归方案。
5. 受影响技术文档和跨端契约同步范围。

## 7. 调试、验证与交付

- 🔴 先运行项目和当前 SDK 已提供的配置检查或 Project Validation，再依据实际错误、日志和设备状态定位问题。
- 🔴 Unity Editor、模拟器或串流预览成功不能替代 Android 包和目标 PICO 设备验证。
- 🔴 构建后记录 Unity、SDK、设备、PICO OS、构建后端、ABI 和实际验证能力；无法真机验证时明确未验证范围。
- 🔴 交付时说明沿用或选择的 SDK 路线、证据来源、版本核验日期、配置变化、迁移授权、验证结果和剩余风险。
