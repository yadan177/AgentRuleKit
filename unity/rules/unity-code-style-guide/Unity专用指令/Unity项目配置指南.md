---
description: Unity 编辑器与项目配置，用于优化工作流
applyTo: "**/*.cs"
---

# Unity 项目配置

本文档介绍经过优化的 Unity 编辑器设置与项目配置，可加快迭代速度并保持一致的资产导入。

## 目录

- [进入播放模式选项](#进入播放模式选项)
- [资产管线设置](#资产管线设置)
- [Burst 编译器设置](#burst-编译器设置)
- [预设](#预设)
- [渲染配置](#渲染配置)
- [构建设置](#构建设置)

---

## 进入播放模式选项

**位置：** Edit → Project Settings → Editor

| 设置 | 值 | 原因 |
|---------|-------|-----|
| Enter Play Mode Options（进入播放模式选项） | ✅ 启用 | 允许自定义进入播放时哪些内容重新加载 |
| Reload Domain（重载 Domain） | ❌ 禁用 | 跳过 C# Domain 重载，每次进入播放可节省 2–5 秒 |
| Reload Scene（重载场景） | ❌ 禁用 | 保留场景状态，迭代更快 |

### 禁用 Domain 重载时的注意事项

禁用 Domain 重载后，**静态字段会在播放会话之间保留**：

```csharp
// 该值在你停止并重新进入播放模式时不会被重置
private static int s_playerCount = 0;

// 修复：在 RuntimeInitializeOnLoadMethod 中重置
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
private static void ResetStatics()
{
    s_playerCount = 0;
}
```

**同样受影响的有：**
- 静态事件（订阅者会在多次进入播放时累积）
- 单例实例
- 静态集合与缓存

详见 [Unity 文档：Domain Reloading](https://docs.unity3d.com/Manual/DomainReloading.html)。

---

## 资产管线设置

**位置：** Unity → Settings（macOS）或 Edit → Preferences（Windows）

| 设置 | 值 | 原因 |
|---------|-------|-----|
| Auto Refresh（自动刷新） | ❌ 禁用 | 由你掌控资产重导的时机 |

**手动刷新：** 在 macOS 按 `Cmd+R`，在 Windows 按 `Ctrl+R` 来刷新资产。

**好处：**
- 工作过程中不会出现意外的中断
- 掌控大文件导入的时机
- 在 IDE 与 Unity 间切换更快

---

## Burst 编译器设置

**位置：** Edit → Project Settings → Burst AOT Settings

| 设置 | 值 | 原因 |
|---------|-------|-----|
| Enable Burst Compilation（启用 Burst 编译） | ✅ 启用 | Jobs 性能显著提升 |
| Synchronous Compilation（同步编译） | ✅ 启用 | 立即编译 Burst 任务，避免首帧卡顿 |

---

## 预设

预设用于统一资产的导入设置。预设位于 `Assets/Settings/Presets/`。

### 纹理导入预设

| 预设 | 用途 | 关键设置 |
|--------|----------|--------------|
| `AlbedoTextureImporter` | 漫反射/颜色贴图 | sRGB、压缩 |
| `NormalTextureImporter` | 法线贴图 | 线性空间、法线贴图格式 |
| `SingleSpriteTextureImporter` | 单独 UI Sprite | Sprite mode 设为 Single |
| `SpriteAtlasTextureImporter` | Sprite Atlas 贴图 | Sprite mode 设为 Multiple |

### 音频导入预设

位于 `Assets/Settings/Presets/Audio/`：

| 预设 | 用途 | 典型设置 |
|--------|----------|------------------|
| `MusicAudioImporter` | 背景音乐 | Streaming、高质量、不压缩 |
| `AmbienceAudioImporter` | 环境循环 | 内存中压缩、便于循环 |
| `SFXAudioImporter` | 音效 | 加载时解压缩、低延迟 |
| `UIAudioImporter` | UI 反馈音 | 小文件、加载时解压缩 |

### 应用预设

**自动（通过 Preset Manager）：**
1. Edit → Project Settings → Preset Manager
2. 添加筛选器（例如文件夹路径或名称模式）
3. 给筛选器指定预设

**手动：**
1. 在 Project 窗口选中资产
2. 在 Inspector 中点击右上角的预设图标（滑条图标）
3. 从下拉框中选择预设

### 创建新预设

1. 按需配置资产的导入设置
2. 点击预设图标 → Save Current To...
3. 保存到 `Assets/Settings/Presets/`

---

## 渲染配置

**位置：** `Assets/Settings/Rendering/`

### URP 质量分级

针对不同目标硬件的三档质量等级：

| 资产 | 目标 | 用途 |
|-------|--------|----------|
| `URP-Performant` | 移动端、低端 | 最佳性能、减少特性 |
| `URP-Balanced` | 中端、默认 | 质量与性能兼顾 |
| `URP-HighFidelity` | 桌面、高端 | 最高画质 |

每个质量等级都有匹配的 Renderer 资产（例如 `URP-Balanced-Renderer`）。

### 体积（Volume）配置

| 资产 | 用途 |
|-------|---------|
| `DefaultVolumeProfile` | 全局后期处理默认值 |
| `SampleSceneProfile` | 场景级覆盖 |

### 运行时切换质量等级

```csharp
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

// 切换到高质量
QualitySettings.SetQualityLevel(2); // 索引取决于质量设置中的顺序
```

---

## 构建设置

### 平台模块

移除未使用的平台模块以降低 Editor 占用：

**位置：** Unity Hub → Installs → Add Modules

只保留你目标发布的平台。常见组合：
- **仅桌面端：** Windows、macOS、Linux
- **移动端：** Android、iOS
- **主机端：** 各平台 SDK

### 构建配置

位于 `Assets/Settings/Build Profiles/`：

构建配置中存储平台相关的构建配置，包括：
- 目标平台
- Development / Release 模式
- 脚本后端（Mono / IL2CPP）
- 压缩设置

---

## 程序集定义

本项目目前使用 Unity 默认的程序集编译方式（所有脚本在同一个程序集中）。

对于较大项目，建议添加程序集定义以：
- 缩小重编译范围
- 强制代码边界
- 提升迭代速度

本项目推荐的结构：
```
Assets/
├── _HowToExamples/HowToExamples.asmdef
├── _StartMenu/StartMenu.asmdef
├── _DemoGame/DemoGame.asmdef
└── Scripts/Utilities/Utilities.asmdef
```

---

## 速查

### 快捷键

| 操作 | macOS | Windows |
|--------|-------|---------|
| 刷新资产 | `Cmd+R` | `Ctrl+R` |
| 进入播放模式 | `Cmd+P` | `Ctrl+P` |
| 暂停 | `Cmd+Shift+P` | `Ctrl+Shift+P` |
| 单帧步进 | `Cmd+Alt+P` | `Ctrl+Alt+P` |

### 设置位置速查

| 设置 | 路径 |
|---------|------|
| 进入播放模式 | Edit → Project Settings → Editor |
| 自动刷新 | Unity → Settings（Preferences） |
| Burst | Edit → Project Settings → Burst AOT Settings |
| 质量等级 | Edit → Project Settings → Quality |
| Preset Manager | Edit → Project Settings → Preset Manager |
| URP 资产 | Assets/Settings/Rendering/ |
| 预设 | Assets/Settings/Presets/ |

---

## 版本信息

- **目标 Unity 版本：** Unity 6.3 (6000.3.x)
- **渲染管线：** URP 17.3.0
- **最后更新：** 2026 年 2 月
