# 04 - UGUI 设计规则

> - 🟢 本文件适用于 Unity UGUI 界面（Canvas/RectTransform/布局系统）。
> - 🔴 不适用：业务逻辑实现、美术资源制作

---

## 1. Canvas 规范

🔴 **AI 开始前**必须确认目标项目是否已采用 UGUI，以及现有 Canvas、输入模块、设计分辨率和平台适配策略。不得因为本规则存在而把 UI Toolkit 或其他既有 UI 体系迁移为 UGUI。

### 1.1 三种渲染模式

Canvas 有 3 种 Render Mode（创建 Canvas 时选择）：

| 模式 | 用途 | 特点 |
|------|------|------|
| **Screen Space - Overlay** | 大多数游戏 UI（血条 / 按钮 / 菜单）| 始终在最上层，不被场景遮挡，**最常用** |
| **Screen Space - Camera** | UI 需要被场景中某些物体遮挡（角色走过 UI 前方）| 由指定 Camera 渲染，可被场景深度测试 |
| **World Space** | 游戏内嵌 UI（看板 / 角色头顶血条）| 作为一个 3D 物体放在场景中 |

**选型决策**：
- 🟡 不需要与场景深度交互且项目已有同类界面使用 Overlay 时，可选 **Overlay**。
- 🟡 需 UI 被场景物体遮挡选 **Camera**
- 🟡 需 3D 空间感选 **World Space**

### 1.2 Canvas Scaler 设置

`Canvas Scaler` 组件决定 UI 如何适配不同屏幕分辨率：

**推荐配置**：
- **UI Scale Mode**: `Scale With Screen Size`（最常用）
- **Reference Resolution**: `1920 × 1080`（项目设计分辨率）
- **Screen Match Mode**: `Match Width Or Height`
- **Match**: `0.5`（宽高平衡）

```text
Canvas → Canvas Scaler
  UI Scale Mode         : Scale With Screen Size
  Reference Resolution  : 1920 × 1080
  Screen Match Mode     : Match Width Or Height
  Match (Width/Height)  : 0.5
```

**三种模式对比**：
- `Constant Pixel Size`：UI 固定像素大小，**不适合多分辨率**
- `Scale With Screen Size`：UI 整体缩放适配屏幕，**推荐** ✅
- `Constant Physical Size`：UI 按物理尺寸显示（用于 AR）

### 1.3 嵌套 Canvas

Canvas 可以**嵌套**（在已有 Canvas 下创建子 Canvas）：

**使用场景**：
- 🟡 **大 UI 分模块**（背包 / 任务 / 主菜单 各一个子 Canvas）
- 🟡 **频繁变化的 UI 单独 Canvas**（减少其他 UI 的 Rebuild 开销）
- ❌ 避免过深嵌套（每多一层有开销）

**性能影响**：
- 每个 Canvas 是独立的 Batch 单元
- Canvas 内的 UI 变化**只 Rebuild 自身**（不影响父 Canvas）
- 子 Canvas 太多会**增加 Draw Call**

> **经验**：UI 数量 < 100 用单 Canvas；UI 数量 > 100 或需要分组更新才嵌套。

## 2. RectTransform 锚点与轴心

### 2.1 锚点预设

RectTransform 相比 Transform 多了**锚点（Anchor）**和**轴心（Pivot）**两个概念。Unity 提供 9 种锚点预设：

```text
┌─[■─■─■]─┐         ■ = 锚点
│ ■     ■ │         ┌─[■─■─■]─┐  = 水平拉伸 + 垂直拉伸
│ ■  ●  ■ │   →     │         │  ● = 轴心（自身中心）
│ ■     ■ │         │   ●     │
└─[■─■─■]─┘         └─────────┘
```

**9 种预设**（Inspector 选 Anchor Presets）：

| 预设 | 行为 | 适用场景 |
|------|------|---------|
| 顶 / 底 / 左 / 右 | 锚点贴一边，固定到父级某条边 | 状态栏、返回按钮 |
| 左上 / 右上 / 左下 / 右下 | 锚点贴一角 | 退出按钮、角标 |
| 居中 | 锚点居中 | 弹窗、Toast |
| **拉伸**（横 / 竖 / 全）| 锚点拉开，UI 跟随父级缩放 | 背景图、列表 |

### 2.2 锚点拉伸 vs 固定

**🔴 关键原则**：锚点决定 UI **如何随屏幕分辨率变化**。

```csharp
// ❌ 错：固定锚点 + 固定 Pos X/Y
// 1920×1080 设计稿上居中，但在 1280×720 上会偏左
Anchor Presets: Center
Pos X: 0, Pos Y: 0

// ✅ 对：固定锚点 + 固定 Pos X/Y（用于固定位置元素）
// 1920×1080 设计稿上距右边 100px，在 1280×720 上仍是距右边 100px
Anchor Presets: Top Right
Pos X: -100, Pos Y: -50
```

**拉伸用法**（用于背景、列表等"占满"的 UI）：

```text
Anchor Min: (0, 0)   // 左下角
Anchor Max: (1, 1)   // 右上角
Pivot:     (0.5, 0.5) // 中心
Left: 0, Right: 0, Top: 0, Bottom: 0  // 边距
→ UI 始终填满父级，边距固定
```

**锁定方式**：
- Inspector 选锚点时**按住 Alt**：同时设置 Pos X/Y + Left/Right

### 2.3 轴心（Pivot）对齐

**轴心**是 UI **自身**的参考点（0-1 范围），决定：
- 🔴 旋转 / 缩放围绕哪点
- 🔴 位置计算的原点

**常用值**：
- `(0.5, 0.5)` 中心（默认，大多数 UI 用这个）
- `(0, 0)` 左下角（用于进度条、UI 锚点拉伸）
- `(0, 1)` 左上角
- `(1, 1)` 右上角

```csharp
// ❌ 错：进度条 Fill 用中心轴心（会导致宽度变化时左右都动）
Image.fillAmount = 0.5f;  // Pivot = (0.5, 0.5) → 中心点不动，两边收缩

// ✅ 对：进度条 Fill 用左中轴心（宽度从左到右增加）
Image.fillAmount = 0.5f;  // Pivot = (0, 0.5) → 左边缘固定，右边缘扩展
```


## 3. 核心 UI 组件

### 3.1 Image vs RawImage

| 维度 | Image | RawImage |
|------|-------|----------|
| 用途 | 显示 Sprite（图集中的图） | 显示 Texture（任意贴图） |
| 性能 | ✅ 可合批 | ❌ 不可合批 |
| 支持类型 | Sprite / Texture2D | 任意 Texture（含 RenderTexture） |

**使用规则**：
- 🔴 **UI 静态图用 Image**（图集 Sprite）
- 🟡 **动态图（截图 / 视频 / RenderTexture）用 RawImage**
- ❌ 不要用 Image 显示任意 Texture（破坏合批）

```csharp
// ✅ Image 显示图集 Sprite
[SerializeField] private Image m_iconImage;
public void SetIcon(Sprite sprite) { m_iconImage.sprite = sprite; }

// ✅ RawImage 显示 RenderTexture（小地图 / 实时画面）
[SerializeField] private RawImage m_minimapImage;
public void SetMinimap(Texture tex) { m_minimapImage.texture = tex; }
```

### 3.2 TextMeshPro

先检查项目 Unity/TMP 版本、现有文本组件、字体与本地化方案。项目已经采用 TMP 时，新文本通常沿用 TMP；遗留 `Text`、第三方文本或平台原生文本不得仅为套用本节自动迁移。迁移会影响字体资源、材质、布局、fallback、包体和多语言验证，需要单独授权。

```csharp
[SerializeField] private TMP_Text m_scoreText;
public void SetScore(int score) { m_scoreText.text = $"Score: {score}"; }
```

**字体设置**：
- 🟡 项目明确选择 TMP 且尚未配置必要资源时，按当前 TMP 版本的官方流程导入或创建所需资源；不要覆盖已有 TMP Settings。
- 🟡 动态字体只能生成源字体实际包含的字形，并受 atlas、fallback、内存和运行时生成成本影响；中文及多语言必须用目标字符集和设备验证。
- 🟡 静态字体适合字符集明确且可在构建前收集的内容；动态、静态或混合 fallback 由本地化范围、包体和运行时成本决定。

**自动换行 / 溢出**：
- `Enable Word Wrapping Text` = true
- `Overflow Mode`：
  - `Overflow`：超出就显示（不推荐）
  - `Truncate`：超出显示 `…`（推荐）
  - `Ellipsis`：超出生省略号

### 3.3 Button

**Button 配置**：
- Transition: `Sprite Swap`（最常用，按钮换图）/ `Color Tint`（变颜色，最简单）
- Navigation: `Automatic`（默认）/ `Explicit`（手写键盘导航）

**事件订阅**：
- 🔴 优先用 **方法组**（不用 lambda，避免分配）

```csharp
// ❌ 错：lambda 订阅（每次分配闭包）
m_button.onClick.AddListener(() => OnButtonClicked());

// ✅ 对：方法组（无分配）
m_button.onClick.AddListener(OnButtonClicked);

private void OnButtonClicked()
{
    // 处理点击
}
```

**配对**：
- 🔴 取消订阅要成对（OnEnable / OnDisable）

```csharp
private void OnEnable()  { m_button.onClick.AddListener(OnButtonClicked); }
private void OnDisable() { m_button.onClick.RemoveListener(OnButtonClicked); }
```

### 3.4 Toggle / Slider / Scrollbar / Dropdown

**Toggle**（开关）：

```csharp
[SerializeField] private Toggle m_soundToggle;

private void OnEnable()
{
    m_soundToggle.onValueChanged.AddListener(OnSoundChanged);
}

private void OnSoundChanged(bool isOn)
{
    AudioManager.Instance.SetMute(!isOn);
}
```

**Slider**（滑动条）：

```csharp
[SerializeField] private Slider m_volumeSlider;
m_volumeSlider.minValue = 0f;
m_volumeSlider.maxValue = 1f;
m_volumeSlider.value = AudioManager.Instance.Volume;
m_volumeSlider.onValueChanged.AddListener(v => AudioManager.Instance.SetVolume(v));
```

**Scrollbar**（滚动条）：

- 单独使用意义不大，通常和 **ScrollRect** 配合
- 设置 `Handle Size`（滑块大小 = 可见区域 / 总内容）

**Dropdown**（下拉框）：

- 🟡 项目已采用 TextMeshPro 时，可使用 `TMP_Dropdown`；它不是 Unity 6 才可用的组件，也不应仅因本规则替换已有 Dropdown。
- 🟡 下拉项的创建成本、虚拟化或对象池需求以选项规模、交互频率和 Profiler 为准。

## 4. 布局组件

### 4.1 Horizontal/Vertical/Grid Layout Group

**自动布局组件**（不手动设置每个子项的 RectTransform）：

| 组件 | 作用 |
|------|------|
| `HorizontalLayoutGroup` | 子项**横向**排列 |
| `VerticalLayoutGroup` | 子项**纵向**排列 |
| `GridLayoutGroup` | 子项**网格**排列（行/列约束） |

**配置项**：
- `Padding`：内边距
- `Spacing`：子项间距
- `Child Alignment`：子项对齐（左/中/右/上/中/下）
- `Child Force Expand`：是否强制填满宽度 / 高度
- `Control Child Size`：是否控制子项宽 / 高

```text
VerticalLayoutGroup
  Padding: (0, 0, 0, 0)
  Spacing: 10
  Child Alignment: Upper Left
  Child Force Expand: Width=true, Height=false
  Child Control Size: Width=true, Height=true
→ 子项纵向排列，宽填满父级，高按内容
```

### 4.2 LayoutElement

`LayoutElement` 组件给 UI 元素**指定最小/首选/弹性尺寸**，在父级有 `Layout Group` 时生效：

| 属性 | 含义 |
|------|------|
| `Min Width/Height` | 最小尺寸 |
| `Preferred Width/Height` | 首选尺寸（默认）|
| `Flexible Width/Height` | 弹性尺寸（剩余空间分配） |

```csharp
// 列表项：宽填满父级（Flexible=1），高固定 80（Preferred=80）
m_itemElement.minHeight = 80f;
m_itemElement.preferredHeight = 80f;
m_itemElement.flexibleHeight = 0f;
m_itemElement.flexibleWidth = 1f;  // 抢占剩余宽度
```

### 4.3 ContentSizeFitter

`ContentSizeFitter` **根据子项自动调整自身尺寸**：

- `Horizontal Fit`：`Unconstrained` / `Preferred Size`（宽跟子项）
- `Vertical Fit`：`Unconstrained` / `Preferred Size`（高跟子项）

**常见用法**：
- 🔴 **滚动列表的 Content**：Vertical Fit = Preferred Size（自动撑高）

```text
ScrollRect
  └─ Viewport
      └─ Content（带 ContentSizeFitter）
          └─ Item 1, Item 2, Item 3...
```

### 4.4 嵌套 Layout 的性能陷阱

**🔴 关键原则**：**避免 Layout 嵌套超过 2 层**。

```csharp
// ❌ 错：3 层 Layout（性能灾难）
HorizontalLayoutGroup
  └─ VerticalLayoutGroup    // 第 1 层
      └─ HorizontalLayoutGroup  // 第 2 层
          └─ 子项

// ✅ 对：扁平化或用空对象做分组
HorizontalLayoutGroup
  ├─ Item1
  ├─ Item2
  └─ Item3
```

**为什么慢**：
- Layout 组件会在子项变化时**重算所有子项 RectTransform**
- 嵌套层数越深，重算时间越长
- 每次子项变化（如 ListView 滚动）都触发整棵 Layout 树 Rebuild

**替代方案**：
- 复杂列表用 **UI Toolkit**（比 UGUI Layout 快得多）
- 静态布局**直接设 RectTransform**（不用 Layout 组件）
- 动态列表用对象池 + 手动设置 RectTransform


## 5. 交互与事件

### 5.1 EventSystem 必备

🔴 **使用 UGUI 交互时，场景必须有与当前输入系统兼容的 EventSystem**；不要在已有 EventSystem 的场景中重复创建，所有 UGUI 事件由它分发。

```text
Scene
└─ EventSystem  ← 必备（没有它所有 UI 点击/拖拽都不响应）
```

**EventSystem 组件**：
- `EventSystem`：事件分发核心
- `Standalone Input Module`：键盘 / 鼠标 / 触屏输入
- `Input System UI Input Module`：仅项目启用新 Input System 时使用；旧输入系统沿用对应模块。

### 5.2 GraphicRaycaster

`GraphicRaycaster` 决定 **Canvas 内哪些 UI 接收事件**（点击 / 拖拽）：

- 需要交互的 Canvas 应确认已挂载并启用 `GraphicRaycaster`；不要假设每个 Canvas 都会自动拥有它
- 配合 `Raycast Target`（Image / Text 默认开启）

**优化**：
- 🔴 不需要接收事件的 UI **关掉 Raycast Target**（背景图、纯装饰）
- 🟡 用 `CanvasGroup` + `blocksRaycasts = false` 临时屏蔽一组 UI

```csharp
// ✅ 关闭装饰图的 Raycast Target
[SerializeField] private Image m_backgroundDecoration;
m_backgroundDecoration.raycastTarget = false;  // 不接收点击
```

### 5.3 IPointerClickHandler / IDragHandler / IScrollHandler

UGUI 事件**实现接口方式**（不用拖 Inspector）：

| 接口 | 触发时机 |
|------|---------|
| `IPointerEnterHandler` | 鼠标进入 |
| `IPointerExitHandler` | 鼠标离开 |
| `IPointerDownHandler` | 鼠标按下 |
| `IPointerUpHandler` | 鼠标抬起 |
| `IPointerClickHandler` | 鼠标点击（按下+抬起） |
| `IDragHandler` | 拖拽 |
| `IScrollHandler` | 滚轮 |
| `IDropHandler` | 拖放放下 |

```csharp
public class DraggableItem : MonoBehaviour, IBeginDragHandler, IDragHandler, IEndDragHandler
{
    private RectTransform m_rectTransform;
    private Canvas m_canvas;

    private void Awake()
    {
        m_rectTransform = GetComponent<RectTransform>();
        m_canvas = GetComponentInParent<Canvas>();
    }

    public void OnDrag(PointerEventData eventData)
    {
        // 跟随鼠标移动
        m_rectTransform.anchoredPosition += eventData.delta / m_canvas.scaleFactor;
    }
}
```

### 5.4 事件冒泡

UGUI 事件**从子节点向父节点冒泡**：

```text
Button (子)
└─ Image (父)
    └─ Canvas (祖父)
        → OnClick 触发顺序：Button → Image → Canvas
```

**控制冒泡**：
- `eventData.Use()` 标记事件已处理（阻止后续接收）
- 父级 Image 默认 `Raycast Target = true`（会拦截点击）

```csharp
public class ChildButton : MonoBehaviour, IPointerClickHandler
{
    public void OnPointerClick(PointerEventData eventData)
    {
        // 处理点击
        eventData.Use();  // 阻止冒泡到父级
    }
}
```

## 6. 性能优化

> **UGUI 性能问题主要是 Draw Call 和 Rebuild**。本节讲具体优化手段。

### 6.1 批处理（同材质 + 同纹理 → 合批）

**Draw Call 合批判断**：
- 🟡 同 Canvas、同材质与同纹理是合批的必要基础，但遮罩、裁剪、排序、Shader、额外材质和 UI 层级都可能打断批处理。
- 🟡 材质或纹理不同通常会增加批次；实际 Draw Call 以目标设备上的 Frame Debugger 与 Profiler 为准。
- 🔴 不要把“元素数 = Draw Call 数”或“同条件元素一定只有 1 个 Draw Call”当作规则；先抓帧确认。

**可能的未合批场景**（元素数量不等于实际 Draw Call）：
```text
Canvas
├─ Image 1 (Material A, Texture A)
├─ Image 2 (Material A, Texture A)  // 本可以合批，但混了别的东西
├─ Image 3 (Material B, Texture A)  // 材质不同 → 不合批
└─ ... 200 个
```

**可能获得合批的场景**（仍需抓帧验证）：
```text
Canvas
└─ Image 1~200 (Material A, Texture A 全部相同)  // 合批成 1 个
```

### 6.2 图集（Sprite Atlas）

🟡 对同屏高频复用的小图标，可评估 `Sprite Atlas` 以降低纹理切换和批次；是否入图集还要平衡内存、加载粒度、平台纹理限制与实际 Frame Debugger 结果。项目已有图集策略时必须沿用。

```csharp
// ✅ 适合：项目图集策略中的高频 UI Sprite
[SerializeField] private Image m_iconImage;
m_iconImage.sprite = iconAtlas.GetSprite("Icon_Health");

// 🟡 可接受：独立加载、低频或不适合与其他资源共同加载的 Sprite
m_iconImage.sprite = singleHealthSprite;
```

**Sprite Atlas 设置**：
1. `Assets → Create → Sprite Atlas`
2. 把要打图集的 Sprite 拖入
3. 勾选 `Include in Build`（运行时也用）
4. 运行时调用 `SpriteAtlasManager.Register(atlas)` 加载

### 6.3 Mask 改 RectMask2D

🔴 **`Mask` 组件有性能问题**，用 `RectMask2D` 替代：

| 组件 | 性能 | 适用 |
|------|------|------|
| `Mask` | ❌ 慢（额外 Draw Call + 模板缓冲） | 任意形状遮罩（圆 / 星） |
| `RectMask2D` | ✅ 快（无额外 Draw Call） | 矩形遮罩（绝大多数场景） |

```csharp
// ❌ 错：用 Mask（圆角矩形不需要）
public Image m_content;
m_content.material = ...;  // Mask 性能开销

// ✅ 对：换 RectMask2D（90% 场景够用）
[SerializeField] private RectMask2D m_contentMask;
m_contentMask.padding = new Vector4(10, 10, 10, 10);  // 边距
```

> **经验**：矩形裁剪可优先评估 `RectMask2D`；圆角、异形、Shader 需求或实际渲染/性能表现不满足时再选择其他方案，并用 Frame Debugger 与 Profiler 验证。

### 6.4 避免频繁 SetActive

❌ **频繁 `SetActive` 会触发 Canvas Rebuild**，详见 03 性能优化 6.x。

```csharp
// ❌ 错：每帧 SetActive（Rebuild 整个 Canvas）
void Update() { m_panel.SetActive(IsVisible()); }

// ✅ 对：用 CanvasGroup 控制显隐
[SerializeField] private CanvasGroup m_panelGroup;
void Update()
{
    m_panelGroup.alpha = IsVisible() ? 1f : 0f;             // 淡入淡出
    m_panelGroup.blocksRaycasts = IsVisible();              // 禁用交互
    m_panelGroup.interactable = IsVisible();
    // Canvas 不 Rebuild
}
```

### 6.5 减少 Raycaster 命中目标

**`GraphicRaycaster` 会参与命中检测**所有 `Raycast Target = true` 的 UI。成本受 Canvas 数量、层级、输入频率、目标设备和交互方式影响，不能用固定数量阈值判断：

- 🔴 装饰性元素不应接收事件；先关闭其 `raycastTarget`。
- 🟡 当 Profiler 显示事件系统、射线检测或交互延迟为瓶颈时，再检查命中目标数量与 Canvas 划分。
- 🟡 UI 数量只是排查信号，不是“< 50 无需看、> 200 必须改”的规则。

**优化方法**：
- 🔴 装饰性 UI 关掉 `raycastTarget = false`
- 🟡 用 `CanvasGroup` 把静态分组（一次设置 `blocksRaycasts`）
- 🟡 复杂 UI 拆成多个 Canvas

### 6.6 关闭不必要的 Raycast Target

🔴 Unity UI 图形组件可能默认参与射线检测。只有实际承担点击、拖拽或阻挡职责的组件才保留 `raycastTarget = true`；纯展示组件应关闭，并结合父级 `CanvasGroup` 和事件穿透需求验证：

```csharp
// ✅ 关闭纯装饰图的 Raycast Target
[SerializeField] private Image m_backgroundDecoration;
m_backgroundDecoration.raycastTarget = false;

// ✅ 关闭纯文字的 Raycast Target（除非需要点击）
[SerializeField] private TMP_Text m_scoreText;
m_scoreText.raycastTarget = false;
```

**经验法则**：
- **按钮 / 交互元素** = `raycastTarget = true`
- **背景图 / 装饰图 / 纯文本** = `raycastTarget = false`
- **整张 Image 都是按钮** = `raycastTarget = true`

## 7. 适配与多分辨率

### 7.1 Canvas Scaler 三种模式

| 模式 | 行为 | 适用 |
|------|------|------|
| `Constant Pixel Size` | UI 固定像素（不缩放） | 像素游戏 / 复古游戏 |
| **`Scale With Screen Size`** | UI 整体缩放适配屏幕 | **大多数游戏** ✅ |
| `Constant Physical Size` | UI 按物理尺寸显示 | AR / VR |

🟡 大多数屏幕空间界面可使用 `Scale With Screen Size`；像素风、AR/VR 或项目已有适配策略应按实际设计目标选择，详见 1.2 Canvas Scaler 设置。

### 7.2 Anchor Presets 拉伸方案

🔴 **适配多分辨率的核心：Anchor Presets**。详见 2.1 锚点预设。

**常见场景**：
- **顶部状态栏**（血条 / 分数）：锚点 = Top Stretch
- **底部按钮**（设置 / 返回）：锚点 = Bottom Center
- **左下角退出按钮**：锚点 = Bottom Left
- **居中弹窗**：锚点 = Center
- **全屏背景图**：锚点 = Stretch（全拉伸）

### 7.3 Safe Area（刘海屏 / 全面屏）

iPhone X+ / Android 全面屏有"刘海"和"底部安全区"，UI 必须避开：

```csharp
// ✅ 适配刘海屏：把底部 UI 抬高到 Safe Area 之上
[SerializeField] private RectTransform m_bottomBar;

private void Awake()
{
    var safeArea = Screen.safeArea;  // 系统提供的安全区
    var anchorMin = safeArea.position;
    var anchorMax = safeArea.position + safeArea.size;

    m_bottomBar.anchorMin = new Vector2(0, anchorMin.y / Screen.height);
    m_bottomBar.anchorMax = new Vector2(1, anchorMax.y / Screen.height);
}
```

**插件推荐**：使用 `Unity.SafeAreaHelper` 或自己写一个 Safe Area 适配器。

### 7.4 横竖屏切换

**两种方案**：

| 方案 | 适用 |
|------|------|
| **固定方向**（Game 视图锁定 Portrait 或 Landscape） | 绝大多数手游 |
| **动态切换** | 平板 / 双端游戏 |

**固定方向**（推荐）：
1. `File → Build Settings → Player Settings`
2. `Resolution and Presentation → Default Orientation`
3. 选 `Portrait` / `Landscape Left` / `Landscape Right`

**动态切换**（需谨慎）：
- UI 布局要**横竖屏通用**（避免硬编码位置）
- 用 `AspectRatio` 调整 Anchor Presets
- Canvas Scaler 用 `Match Width Or Height = 0.5`（等比缩放）

```csharp
// ✅ 监听屏幕方向变化
private void OnRectTransformDimensionsChange()
{
    if (Screen.width > Screen.height)
    {
        // 横屏布局
    }
    else
    {
        // 竖屏布局
    }
}
```


## 8. 资源与图集

### 8.1 Sprite Atlas 配置

**创建图集**（`Assets → Create → Sprite Atlas`）：

```text
Sprite Atlas (UIBaseAtlas)
  ├─ Inspector Settings
  │   ├─ Type: Master
  │   ├─ Include in Build: ✅
  │   └─ Padding: 4 (避免边缘像素采样)
  └─ Objects for Packing
      ├─ UI/Icon_Health.png
      ├─ UI/Icon_Mana.png
      ├─ UI/Button_Normal.png
      └─ ... (拖入要打图集的 Sprite)
```

**Atlas Variant**（同一图集的不同分辨率版本）：
- 高清设备用 2x / 4x 图集
- 低端设备用 1x 图集（节省内存）

```text
UIBaseAtlas (2x)        ← 高清版（2 倍像素密度）
UIBaseAtlas (1x)        ← 标清版
```

### 8.2 UI 切图命名

**推荐命名规范**：

```text
UI_<Category>_<Name>_<State>_<Size>

例子:
UI_Icon_Health_Normal_64x64
UI_Icon_Health_Disabled_64x64
UI_Btn_Start_Normal_256x96
UI_Btn_Start_Pressed_256x96
UI_Bg_Panel_Default_1920x1080
```

**前缀分类**：
- `UI_Icon_*`：图标（小尺寸）
- `UI_Btn_*`：按钮（带状态：Normal / Pressed / Disabled）
- `UI_Bg_*`：背景
- `UI_Fx_*`：特效

### 8.3 -sprite 边框（Sliced）

🔴 **可变大小 UI 必须用 9-sprite**（否则拉伸会失真）。

**创建 9-sprite**：
1. 选 Sprite，Inspector 选 `Texture Type = Sprite (2D and UI)`
2. `Sprite Editor` → 拖动四个绿线（左 / 右 / 上 / 下）定义边框

```text
┌─[1─1─1]─┐         1 = 边角（不拉伸）
│ 2     2 │         2 = 边线（单方向拉伸）
│ 2  3  2 │         3 = 中心（双向拉伸）
│ 2     2 │
└─[1─1─1]─┘
```

**使用**：
- Image `Image Type = Sliced`
- Sprite 选择 9-sprite 资源
- 调整 RectTransform 任意大小，边角不失真

```csharp
// ✅ 按钮背景用 9-sprite
[SerializeField] private Image m_buttonBg;
m_buttonBg.sprite = slicedButtonSprite;  // 9-sprite 资源
m_buttonBg.type = Image.Type.Sliced;     // 切到 Sliced 模式
// 任意调整 RectTransform 宽高，边角不变形
```

### 8.4 导入设置

🔴 **UI 贴图导入设置必须沿用项目图集、目标平台和画质分级策略**。修改前检查资源实际显示尺寸、透明度、像素风格、内存预算、平台覆盖和是否进入 Sprite Atlas：

| 设置 | 决策依据 | 注意事项 |
|------|--------|------|
| `Texture Type` | Image/Sprite、RawImage/Texture 或其他实际消费者 | 不为统一外观批量改类型 |
| `Sprite Mode` | 单图、多图切片和图集流程 | 与现有 Sprite Editor 数据一致 |
| `Pixels Per Unit` | 项目 UI/2D 尺度和 Canvas 使用方式 | 不写固定 100/50 |
| `Filter Mode` | 像素风格、缩放比例和目标分辨率 | Point/Bilinear/Trilinear 按视觉验证选择 |
| `Compression` / `Format` | 目标平台、透明度、色彩质量和内存预算 | 使用项目平台 override 并检查真机伪影 |
| `Max Size` | 源图、最大显示尺寸、图集和设备纹理限制 | 避免无依据固定 2048/4096 |
| `Wrap Mode` | 是否允许平铺、采样边界和 Shader 用法 | 普通非平铺 UI 常用 Clamp，但不是统一答案 |

## 9. C# 端用法

### 9.1 [SerializeField] 引用 UI 组件

引用取得方式由所有权决定：Inspector 中稳定配置的引用通常使用 `[SerializeField] private`；同一 GameObject 上的必需组件可以在初始化时 `GetComponent` 并缓存；运行时生成对象通过工厂、绑定或创建结果取得。不要为了避免一次初始化查询而暴露 `public` 字段，也不要在热路径重复查询。

```csharp
// 不推荐：仅为 Inspector 赋值暴露 public 字段
public Button m_button;

// Inspector 中稳定配置的子对象引用
[SerializeField] private Button m_button;

// 同一对象上的必需组件可初始化一次并缓存
private Image m_image;

private void Awake()
{
    m_image = GetComponent<Image>();
    m_button.onClick.AddListener(OnButtonClicked);
}
```

### 9.2 缓存 GetComponent 结果

- 🔴 在引用所有权建立后缓存需要重复访问的组件；不要规定所有 UI 引用都必须在 `Awake` 获取。
- 🟡 `Awake` 常用于同对象组件和初始化不变量，`OnEnable`/`OnDisable` 常用于可重复启停的订阅；动态生成 UI 按工厂和复用生命周期确定绑定时机。

```csharp
public class InventoryItem : MonoBehaviour
{
    [SerializeField] private Image m_icon;
    [SerializeField] private TMP_Text m_name;
    [SerializeField] private TMP_Text m_count;
    [SerializeField] private Button m_useButton;

    private void OnEnable()
    {
        // 动态生成的 UI 在 OnEnable 缓存
        m_useButton.onClick.AddListener(OnUseClicked);
    }

    private void OnDisable()
    {
        m_useButton.onClick.RemoveListener(OnUseClicked);
    }
}
```

### 9.3 UI 与数据通信

**三种通信方式**（按推荐顺序）：

| 方式 | 适用 | 优点 | 缺点 |
|------|------|------|------|
| **[SerializeField] 引用** | UI 控制器直接拿数据 | 简单直接 | 紧耦合 |
| **事件 / 委托** | 1 对多通知 | 解耦 | 事件多时管理难 |
| **ScriptableObject** | 配置 / 共享数据 | 美术可调 | 适合静态数据 |

```csharp
// ✅ 模式 1：直接引用（简单 UI）
public class HUD : MonoBehaviour
{
    [SerializeField] private PlayerStats m_playerStats;
    [SerializeField] private TMP_Text m_hpText;

    private void Update()
    {
        m_hpText.text = $"HP: {m_playerStats.Health}";
    }
}

// ✅ 模式 2：事件（解耦）
public class HealthBar : MonoBehaviour
{
    [SerializeField] private PlayerStats m_playerStats;
    [SerializeField] private Image m_fillImage;

    private void OnEnable()
    {
        m_playerStats.OnHealthChanged += Refresh;
    }

    private void OnDisable()
    {
        m_playerStats.OnHealthChanged -= Refresh;
    }

    private void Refresh(int newHealth) { /* ... */ }
}

// ✅ 模式 3：ScriptableObject（配置）
[CreateAssetMenu(fileName = "UISettings")]
public class UISettings : ScriptableObject
{
    public Color PrimaryColor = Color.blue;
    public Font MainFont;
}
```

> 详见 `02-模式设计规则.md` 2.1 ScriptableObject 架构。
