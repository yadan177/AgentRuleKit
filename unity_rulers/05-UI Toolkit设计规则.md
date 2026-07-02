# 05 - Unity UI Toolkit 设计规则

> 🟢 本文件适用于 Unity UI Toolkit 界面（UXML/USS/BEM/Flexbox/数据绑定）。

> 🔴 不适用：业务逻辑实现、美术资源制作、旧版 IMGUI

---

## 1. 官方文档（按版本）
| 你的 Unity 版本 | 官方文档 URL |
|---|---|
| Unity 2021.2 ~ 2021.3 | `https://docs.unity3d.com/2021.3/Documentation/Manual/UIElements.html` |
| Unity 2022 LTS | `https://docs.unity3d.com/2022.3/Documentation/Manual/UIElements.html` |
| Unity 6.0 | `https://docs.unity3d.com/6000.0/Documentation/Manual/UIElements.html` |
| Unity 6.x（最新） | `https://docs.unity3d.com/6000.x/Documentation/Manual/UIElements.html` |
> 上表中的「URL」只是基线入口；进入文档后，左侧导航里的 API 文档按 Unity 版本可能略有差异。
## 2. 文件命名与组织
- ✅ UXML/USS 文件名使用 **PascalCase**，与 Unity 约定保持一致（例如 `MainMenu.uxml`、`InventoryPanel.uxml`、`PlayerHUD.uss`）。
- ✅ UXML 与 USS 放在统一的目录结构中（例如 `Assets/UI/UXML/` 与 `Assets/UI/USS/`）。
- ✅ USS 文件名与对应 UXML 一致（例如 `MainMenu.uss` 对应 `MainMenu.uxml`）。
---

## 3. 关键：USS 与 CSS 差异

**USS（Unity Style Sheets）不是标准 CSS**，而是 CSS 的子集加上 Unity 专属扩展。

### 完整对比表

| 特性 | CSS | USS |
|---|---|---|
| 布局模型 | Flexbox **与** Grid | 仅 Flexbox — **不支持** `display: grid` |
| 长度单位 | `px`、`%`、`em`、`rem`、`vw`、`vh` | **仅** `px` 和 `%` — 不支持 `em`、`rem`、`vw`、`vh` |
| `calc()` | ✅ 支持 | ❌ 不支持 |
| `z-index` | ✅ 支持 | ❌ 不支持 — 改用 UXML 元素顺序 |
| `transform` 简写 | `transform: scale(1.1) rotate(45deg)` | 独立属性：`scale: 1.1;` `rotate: 45deg;` `translate: 10px 0;` |
| `:nth-child()` | ✅ | ❌ 不支持 |
| `:not()` | ✅ | ❌ 不支持 |
| `:first-child`、`:last-child` | ✅ | ❌ 不支持 |
| `:hover`、`:active`、`:focus` | ✅ | ✅ 支持 |
| `:checked`、`:disabled`、`:enabled` | ✅ | ✅ 支持 |
| 自定义伪类 | `:is()`、`:where()` 等 | ❌ 仅 USS 内建伪类 |
| CSS 变量 | `--color: red;` 可写在任意选择器 | `--color: red;` **仅** `:root {}` 内可声明 |
| `@media` 查询 | ✅ | ❌ 不支持 |
| `@import` | ✅ | ❌ — 改用 UXML 的 `<Style src="..."/>` |
| 字体相对单位 | `em`、`rem` | ❌ — 改用 `px` |
| 颜色值 | 十六进制 `#FF6432`、`rgb()`、`rgba()` | 推荐 `rgb()` / `rgba()`（Unity 2022 及更早十六进制无效，Unity 6+ 待验证） |
| 文本对齐 | `text-align: center` | `-unity-text-align: middle-center` |
| 字体粗细 | `font-style: bold` | `-unity-font-style: bold` |
| 背景缩放 | `background-size` | `-unity-background-scale-mode: scale-to-fit` 等 |
| 9-slice 边框 | 无对应 | `-unity-slice-left/right/top/bottom: Npx` |
| 盒模型 | 可配置 | 默认 `box-sizing: border-box` |

### 颜色值 —— 重点

```css
/* ✅ USS — 仅使用 rgb() 或 rgba() */
background-color: rgb(255, 100, 50);
background-color: rgba(255, 100, 50, 0.8);
color: rgb(200, 200, 200);

/* ⚠️ Unity 2022 及更早十六进制颜色无效，推荐用 rgb()/rgba() */
background-color: #FF6432;
```

### Unity 专属属性

```css
/* 文本 */
-unity-font-style: bold;              /* normal、italic、bold、bold-and-italic */
-unity-text-align: middle-center;     /* upper/middle/lower + left/center/right */
-unity-font-definition: url('...');   /* 引用 FontAsset */
-unity-text-outline-width: 1px;
-unity-text-outline-color: rgb(0, 0, 0);

/* 背景 */
-unity-background-scale-mode: scale-to-fit;  /* scale-and-crop、stretch-to-fill */
-unity-background-image-tint-color: rgb(255, 0, 0);

/* 9-slice 精灵边框 */
-unity-slice-left: 10;
-unity-slice-right: 10;
-unity-slice-top: 10;
-unity-slice-bottom: 10;
-unity-slice-scale: 1px;

/* 溢出 */
overflow: hidden;    /* USS 用此裁剪子元素 */
```

### URL 路径格式

```css
/* 工程数据库路径（推荐用于资产） */
background-image: url('project://database/Assets/UI/Icons/icon.png');

/* 资源路径 */
background-image: resource('UI/Icons/icon');

/* 相对路径（相对 USS 文件位置） */
background-image: url('../Icons/icon.png');
```

### 拾取模式（Picking Mode）

```css
/* 允许元素接收指针事件（默认） */
picking-mode: position;

/* 忽略指针事件 —— 穿透到下层元素 */
picking-mode: ignore;
```

---

## 4. USS 命名约定（BEM）

### 指南

- ✅ UXML 的 `name` 和 `class` 值使用 **kebab-case**（例如 `navbar-menu`、`shop-button`）。
- ✅ 使用 **BEM**（Block-Element-Modifier）以保证可维护性。
- ✅ `name` 用于唯一标识符（C# 中查询的元素），`class` 用于可复用样式。
- ✅ 同一 block 内保持 `name` 唯一，提升查询性能。
- ✅ 选择器保持**扁平且具体**：优先使用 `.block__element` 而非深层后代链。
- ✅ **Modifier** 用作叠加的 class（例如 `.button--small`）。
- ✅ 将选择器字符串常量集中在 C# 中，避免拼写错误。
- ❌ 不要依赖深层后代选择器（例如 `.a .b .c`）—— 它们很脆弱。
- ❌ 不要给一个元素堆叠过多不相关的 class。

### BEM 模式

模式：`block-name__element-name--modifier-name`

| 部分 | 描述 | 示例 |
|------|------|------|
| **Block** | 独立组件 | `navbar-menu`、`sidebar`、`login-form` |
| **Element** | block 的组成部分（用 `__`） | `__item`、`__button`、`__input-field` |
| **Modifier** | 变体/状态（用 `--`） | `--active`、`--collapsed`、`--error` |

### BEM 示例

**Block 命名：**
- ✅ `navbar-menu`、`sidebar`、`login-form`
- ❌ `menu`（过于通用）、`navBarMenu`（camelCase）、`navbar_menu`（下划线）

**Element 命名：**
- ✅ `navbar-menu__item`、`sidebar__toggle-button`、`login-form__input-field`
- ❌ `navbar-item`（缺 block）、`sidebar-button`（缺 `__`）

**Modifier 命名：**
- ✅ `navbar-menu__item--active`、`button--primary`、`login-form__input-field--error`
- ❌ `navbar-menu__item-active`（缺 `--`）、`sidebar__toggleButton--collapsed`（camelCase）

### BEM 的 UXML 示例

```xml
<ui:UXML xmlns:ui="UnityEngine.UIElements">
  <!-- Block 容器 -->
  <ui:VisualElement name="navbar-menu" class="navbar-menu">
    <!-- 带 modifier 的元素 -->
    <ui:Button name="navbar-menu__shop-button"
               class="navbar-menu__shop-button button button--primary"
               text="Shop" />
    <!-- 通过 modifier 区分变体 -->
    <ui:Button name="navbar-menu__settings-button"
               class="navbar-menu__settings-button button button--small"
               text="Settings" />
  </ui:VisualElement>
</ui:UXML>
```

### BEM 的 USS 示例

```css
/* Block 基础 */
.navbar-menu { padding: 8px; }
.navbar-menu > * { margin-right: 8px; }  /* gap: 8px 不支持 —— 用子元素的 margin */

/* Element 基础 */
.navbar-menu__shop-button { min-width: 120px; }

/* 通用按钮体系 + modifier */
.button { height: 32px; padding-left: 12px; padding-right: 12px; }
.button--primary { background-color: rgb(40, 120, 240); color: rgb(255, 255, 255); }
.button--small { height: 24px; font-size: 11px; }

/* 状态 class（在 C# 中切换） */
.is-selected { border-color: rgb(255, 200, 0); border-width: 2px; }
.is-disabled { opacity: 0.5; }
```

### 在 C# 中集中选择器

```csharp
// 将选择器集中为常量，避免拼写错误
private const string k_navbarMenu = "navbar-menu";
private const string k_shopButton = "navbar-menu__shop-button";
private const string k_settingsButton = "navbar-menu__settings-button";

// 使用
var navbar = root.Q<VisualElement>(k_navbarMenu);
var shopButton = root.Q<Button>(k_shopButton);
```

### 在 C# 中切换 class

```csharp
var btn = root.Q<Button>(k_shopButton);

// 增删 modifier
btn.AddToClassList("button--primary");
btn.RemoveFromClassList("button--small");

// 切换状态 class（EnableInClassList 直接设置状态，比 Toggle 更明确）
btn.EnableInClassList("is-selected", true);
btn.EnableInClassList("is-disabled", false);

// Toggle（翻转当前状态）
btn.ToggleInClassList("button--primary");
```

---

## 5. USS 变量（设计 Token）

USS 变量必须声明在 `:root {}` 中，无法限定在其它选择器上。

```css
:root {
    --color-primary: rgb(72, 144, 226);
    --color-secondary: rgb(100, 150, 200);
    --color-surface: rgb(40, 40, 40);
    --color-text: rgb(210, 210, 210);
    --color-text-muted: rgb(140, 140, 140);
    --color-border: rgba(255, 255, 255, 0.15);

    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;

    --radius-sm: 4px;
    --radius-md: 8px;

    --font-size-sm: 12px;
    --font-size-md: 14px;
    --font-size-lg: 18px;

    --border-radius: 4px;
}

.card {
    background-color: var(--color-surface);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    border-width: 1px;
    border-color: var(--color-border);
}

.button--primary {
    background-color: var(--color-primary);
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
}
```

---

## 6. USS 伪类

USS 仅支持以下伪类：

| 伪类 | 触发条件 |
|---|---|
| `:hover` | 鼠标位于元素上 |
| `:active` | 元素被按下 |
| `:focus` | 元素获得键盘焦点 |
| `:disabled` | 元素被 `SetEnabled(false)` |
| `:enabled` | 元素处于启用状态（默认） |
| `:checked` | Toggle/RadioButton 处于选中 |
| `:selected` | 列表项被选中 |
| `:root` | 根 VisualElement |

```css
.button--primary:hover {
    background-color: rgb(90, 160, 240);
}

.button--primary:active {
    background-color: rgb(55, 120, 200);
    scale: 0.97;
}

.toggle:checked > .toggle__checkmark {
    background-color: var(--color-primary);
}

.input:disabled {
    opacity: 0.4;
}

/* Unity 内置元素的 class */
.unity-button:disabled {
    opacity: 0.5;
    background-color: rgb(128, 128, 128);
}
```

> ❌ `:nth-child()`、`:not()`、`:first-child`、`:last-child`、`:is()`、`:where()` **均不支持**。

---

## 7. USS 常用属性速查

### 显示与可见性

```css
display: flex;                 /* 默认 —— 可见 */
display: none;                 /* 隐藏，不占布局空间 */

visibility: visible;           /* 默认 */
visibility: hidden;            /* 隐藏，保留空间 */

opacity: 1;                    /* 0 到 1 */

overflow: visible;             /* 默认 */
overflow: hidden;              /* 裁剪内容 */
```

### 尺寸

```css
width: 100px;
width: 50%;
width: auto;

height: 100px;
min-width: 50px;
max-width: 200px;
min-height: 50px;
max-height: 200px;

flex-grow: 1;                  /* 填满可用空间 */
flex-shrink: 0;                /* 不收缩 */
```

### 间距

```css
padding: 10px;
padding: 10px 20px;            /* 上/下 左/右 */
padding: 10px 20px 15px 25px;  /* 上 右 下 左 */

margin: 10px;
margin-left: auto;             /* 推至右侧 */
```

### 边框

```css
border-width: 2px;
border-color: rgb(0, 0, 0);
border-radius: 8px;
border-top-left-radius: 8px;
```

### 背景

```css
background-color: rgb(50, 50, 50);
background-color: rgba(255, 255, 255, 0.1);
background-image: url('project://database/Assets/UI/background.png');
-unity-background-scale-mode: stretch-to-fill;
-unity-background-scale-mode: scale-to-fit;
-unity-background-image-tint-color: rgb(255, 255, 255);
```

### 文本

```css
color: rgb(0, 0, 0);
font-size: 16px;
-unity-font-style: bold;
-unity-text-align: middle-center;
white-space: nowrap;
-unity-text-outline-width: 1px;
-unity-text-outline-color: rgb(0, 0, 0);
```

---

## 8. Flexbox 布局系统

Unity UI Toolkit 使用 **Yoga 布局引擎**，实现了 CSS Flexbox 的一个子集。**没有 grid** —— 每个容器要么是行、要么是列。

### 容器属性（父级）

```css
/* 主轴方向 */
flex-direction: column;         /* 默认 —— 垂直堆叠 */
flex-direction: row;            /* 横向布局 */
flex-direction: column-reverse;
flex-direction: row-reverse;

/* 换行 */
flex-wrap: nowrap;              /* 默认 —— 不换行 */
flex-wrap: wrap;
flex-wrap: wrap-reverse;

/* 主轴对齐 */
justify-content: flex-start;   /* 默认 */
justify-content: flex-end;
justify-content: center;
justify-content: space-between;
justify-content: space-around;

/* 交叉轴对齐 */
align-items: stretch;          /* 默认 */
align-items: flex-start;
align-items: flex-end;
align-items: center;

/* ⚠️ USS 不支持 gap —— 改用子元素的 margin */
/* margin: 0 4px; 应用在子元素上来实现间距 */
```

> ❌ **`gap` 不是 USS 支持的属性。** 若要间隔 flex 子元素，请使用子元素的 `margin`（如 `margin-right: 8px;` 或 `margin-bottom: 8px;`）。

### 子项属性（Children）

```css
/* 弹性 */
flex-grow: 1;                  /* 拉伸以填满可用空间 */
flex-shrink: 1;                /* 默认 —— 可收缩 */
flex-basis: auto;              /* 默认 —— 基于内容 */
flex-basis: 100px;             /* 固定 basis 大小 */

/* 简写 */
flex: 1;                       /* flex-grow: 1; flex-shrink: 1; flex-basis: 0; */

/* 单独的对齐覆盖 */
align-self: center;
```

### 常用布局模式

```css
/* 全屏容器 */
.fullscreen { flex-grow: 1; }

/* 横向工具栏 */
.toolbar {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
}

/* 工具栏子项间距 —— USS 不支持 gap，改用 margin */
.toolbar > * {
    margin-right: 8px;
}

/* 居中内容 */
.centered-container {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
}

/* 占据剩余空间 */
.content-area {
    flex-grow: 1;
    flex-shrink: 1;
}

/* 固定尺寸 */
.sidebar {
    width: 240px;
    flex-shrink: 0;
}
```

### 定位模式

```css
/* 相对（默认） —— 参与 flexbox */
position: relative;
left: 10px;
top: 10px;

/* 绝对 —— 脱离 flexbox 流 */
position: absolute;
left: 0; right: 0; top: 0; bottom: 0;
```

---

## 9. 过渡与动画

```css
.button {
    background-color: rgb(70, 130, 200);
    scale: 1;
    transition-property: background-color, scale;
    transition-duration: 0.15s, 0.1s;
    transition-timing-function: ease, ease-out;
}

.button:hover {
    background-color: rgb(90, 155, 225);
    scale: 1.05 1.05;
}

.button:active {
    scale: 0.97;
}
```

可动画属性包括：`background-color`、`color`、`opacity`、`scale`、`translate`、`rotate`、`width`、`height`、`margin`、`padding`、`border-color`、`border-width`。

### 变换属性

```css
scale: 1.5 1.5;
rotate: 45deg;
translate: 10px 20px;
```

---

## 10. UXML 结构与最佳实践

### 文件结构

```xml
<ui:UXML xmlns:ui="UnityEngine.UIElements"
         editor-extension-mode="False">

    <!-- 引用样式表 -->
    <Style src="project://database/Assets/UI/Styles/MainStyles.uss" />

    <!-- 根容器 -->
    <ui:VisualElement name="root" class="container">
        <!-- 内容 -->
    </ui:VisualElement>

</ui:UXML>
```

### 命名速览

- **`name`**：kebab-case，在所属 block 内唯一（如 `player-panel`、`health-label`）—— 用于 C# 查询
- **`class`**：BEM 形式，可复用样式（如 `card`、`card__title`、`button--primary`）
- **文件名**：PascalCase（如 `MainMenu.uxml`、`InventoryPanel.uss`）

### UXML 中的数据绑定

```xml
<ui:VisualElement data-source-type="MyDataClass, Assembly-CSharp" name="data-root">
    <ui:Label binding-path="PropertyName" />
</ui:VisualElement>
```

---

## 11. UXML 元素速查表

常用 UI Toolkit 元素的速查，附 UXML 示例和关键属性。

---

### 文本元素

#### Label

静态、不可编辑的文本。

```xml
<ui:Label text="Hello World" name="my-label" />
<ui:Label text="Styled Label" class="title-text" />
```

#### TextField

单行可编辑文本输入。

```xml
<ui:TextField label="Username" value="Player1" name="username-field" />
<ui:TextField placeholder-text="Enter name..." />
<ui:TextField password="true" label="Password" />
<ui:TextField multiline="true" label="Description" />
```

---

### 按钮元素

#### Button

可点击的按钮。

```xml
<ui:Button text="Click Me" name="action-button" />
<ui:Button text="Submit" class="button--primary" />
<ui:Button name="icon-button" class="icon-button">
    <ui:Image class="button-icon" />
</ui:Button>
```

#### Toggle

复选框式的开关控件。

```xml
<ui:Toggle label="Enable Sound" value="true" name="sound-toggle" />
<ui:Toggle label="Auto-Save" value="false" />
```

#### RadioButton & RadioButtonGroup

互斥选择。

```xml
<ui:RadioButtonGroup value="0" name="difficulty-group">
    <ui:RadioButton label="Easy" />
    <ui:RadioButton label="Normal" />
    <ui:RadioButton label="Hard" />
</ui:RadioButtonGroup>
```

---

### 数值输入元素

#### IntegerField

整数输入。

```xml
<ui:IntegerField label="Count" value="10" name="count-field" />
```

#### FloatField

浮点数输入。

```xml
<ui:FloatField label="Speed" value="1.5" name="speed-field" />
```

#### Slider

水平滑块，在范围内选择浮点值。

```xml
<ui:Slider label="Volume" low-value="0" high-value="100" value="50" name="volume-slider" />
<ui:Slider low-value="0" high-value="1" value="0.5" show-input-field="true" />
```

#### SliderInt

仅整数的滑块。

```xml
<ui:SliderInt label="Level" low-value="1" high-value="10" value="5" name="level-slider" />
<ui:SliderInt low-value="0" high-value="100" value="50" show-input-field="true" />
```

#### MinMaxSlider

双滑块选区间。

```xml
<ui:MinMaxSlider label="Price Range"
                 low-limit="0"
                 high-limit="1000"
                 min-value="100"
                 max-value="500"
                 name="price-range" />
```

---

### 选择元素

#### DropdownField

下拉菜单。

```xml
<ui:DropdownField label="Weapon"
                  choices="Sword,Axe,Bow,Staff"
                  index="0"
                  name="weapon-dropdown" />
```

#### EnumField

由 C# 枚举填充的下拉。

```xml
<ui:EnumField label="Direction"
              type="UnityEngine.TextAnchor, UnityEngine.CoreModule"
              value="MiddleCenter" />
```

#### PopupField

类似下拉，需要代码配置。

```xml
<ui:PopupField label="Select Option" name="popup-field" />
```

---

### 显示元素

#### ProgressBar

可视化进度条。

```xml
<ui:ProgressBar title="Health"
                low-value="0"
                high-value="100"
                value="75"
                name="health-bar" />
```

#### Image

显示精灵或贴图。

```xml
<ui:Image name="player-portrait" class="portrait-image" />
<ui:Image name="icon" style="width: 64px; height: 64px;" />
```

#### HelpBox

信息/警告/错误提示。

```xml
<ui:HelpBox text="This is an informational message." message-type="Info" />
<ui:HelpBox text="Warning: Low health!" message-type="Warning" />
<ui:HelpBox text="Error: Invalid input" message-type="Error" />
```

---

### 容器元素

#### VisualElement

用于分组和布局的基础容器。

```xml
<ui:VisualElement name="container" class="panel">
    <ui:Label text="Content here" />
</ui:VisualElement>

<!-- 横向行 -->
<ui:VisualElement style="flex-direction: row;">
    <ui:Button text="A" />
    <ui:Button text="B" />
</ui:VisualElement>
```

#### ScrollView

可滚动容器，用于超出视口的内容。

```xml
<!-- 垂直滚动（默认） -->
<ui:ScrollView name="content-scroll">
    <ui:Label text="Item 1" />
    <ui:Label text="Item 2" />
</ui:ScrollView>

<!-- 水平滚动 -->
<ui:ScrollView mode="Horizontal" name="horizontal-scroll">
    <ui:VisualElement style="flex-direction: row;">
        <ui:Image name="img1" />
        <ui:Image name="img2" />
    </ui:VisualElement>
</ui:ScrollView>

<!-- 两个方向 -->
<ui:ScrollView mode="VerticalAndHorizontal"
               horizontal-scroller-visibility="Auto"
               vertical-scroller-visibility="AlwaysVisible">
    <!-- 大内容 -->
</ui:ScrollView>
```

**ScrollView 属性：**
| 属性 | 取值 | 描述 |
|-----------|--------|-------------|
| `mode` | `Vertical`、`Horizontal`、`VerticalAndHorizontal` | 滚动方向 |
| `horizontal-scroller-visibility` | `Auto`、`AlwaysVisible`、`Hidden` | 滚动条显隐 |
| `vertical-scroller-visibility` | `Auto`、`AlwaysVisible`、`Hidden` | 滚动条显隐 |
| `touch-scroll-type` | `Unrestricted`、`Elastic`、`Clamped` | 触摸行为 |

#### GroupBox

带标签的视觉分组容器。

```xml
<ui:GroupBox text="Player Settings" name="player-settings-group">
    <ui:TextField label="Name" />
    <ui:Slider label="Volume" low-value="0" high-value="100" value="50" />
    <ui:Toggle label="Mute" value="false" />
</ui:GroupBox>
```

#### Foldout

可折叠/展开的容器。

```xml
<ui:Foldout text="Advanced Options" value="false" name="advanced-foldout">
    <ui:Toggle label="Debug Mode" value="false" />
    <ui:IntegerField label="Max FPS" value="60" />
</ui:Foldout>

<!-- 默认展开 -->
<ui:Foldout text="Basic Settings" value="true">
    <ui:Slider label="Brightness" low-value="0" high-value="100" value="50" />
</ui:Foldout>
```

#### Box

带默认边框样式的简单容器。

```xml
<ui:Box name="content-box">
    <ui:Label text="Boxed content" />
</ui:Box>
```

#### TemplateContainer

实例化 UXML 模板的占位符。

```xml
<ui:TemplateContainer name="card-slot" />
```

#### IMGUIContainer

嵌入旧版 IMGUI 渲染。**仅限 Editor UI。**

```xml
<ui:IMGUIContainer name="imgui-preview" />
```

---

### 列表与树

#### ListView

虚拟化列表，用于高效展示大数据集。通过 C# 的 `makeItem`/`bindItem` 填充。

```xml
<ui:ListView name="inventory-list"
             fixed-item-height="50"
             virtualization-method="FixedHeight"
             selection-type="Single"
             show-alternating-row-backgrounds="ContentOnly"
             show-border="true" />

<!-- 多选 -->
<ui:ListView name="multi-select-list"
             fixed-item-height="40"
             selection-type="Multiple" />

<!-- 可重排序 -->
<ui:ListView name="reorderable-list"
             fixed-item-height="30"
             reorderable="true" />
```

**ListView 属性：**
| 属性 | 取值 | 描述 |
|-----------|--------|-------------|
| `fixed-item-height` | `30`、`50` 等 | 每行高度（像素） |
| `virtualization-method` | `FixedHeight`、`DynamicHeight` | 性能模式 |
| `selection-type` | `None`、`Single`、`Multiple` | 选择行为 |
| `show-alternating-row-backgrounds` | `None`、`ContentOnly`、`All` | 斑马纹 |
| `show-border` | `true`、`false` | 边框显隐 |
| `reorderable` | `true`、`false` | 拖拽重排 |

**C# 设置：**
```csharp
var listView = root.Q<ListView>("inventory-list");
listView.makeItem = () => new Label();
listView.bindItem = (element, index) => ((Label)element).text = m_items[index].Name;
listView.itemsSource = m_items;

// 数据变化时刷新
listView.RefreshItems();
```

#### TreeView

用于嵌套数据的层级树。

```xml
<ui:TreeView name="file-tree"
             fixed-item-height="24"
             selection-type="Single"
             show-border="true" />
```

**C# 设置：**
```csharp
var treeView = root.Q<TreeView>("file-tree");
treeView.makeItem = () => new Label();
treeView.bindItem = (element, index) =>
{
    var item = treeView.GetItemDataForIndex<FileItem>(index);
    ((Label)element).text = item.Name;
};
treeView.SetRootItems(m_rootItems);
```

#### MultiColumnListView

类似表格的多列可排序列表。

```xml
<ui:MultiColumnListView name="data-table"
                        fixed-item-height="30"
                        show-border="true"
                        show-alternating-row-backgrounds="ContentOnly"
                        sorting-enabled="true">
    <ui:Columns>
        <ui:Column name="name-column" title="Name" width="150" />
        <ui:Column name="type-column" title="Type" width="100" />
        <ui:Column name="value-column" title="Value" width="80" stretchable="true" />
    </ui:Columns>
</ui:MultiColumnListView>
```

**列属性：**
| 属性 | 描述 |
|-----------|-------------|
| `name` | 列的唯一标识 |
| `title` | 列头显示文字 |
| `width` | 初始宽度（像素） |
| `min-width` | 最小宽度 |
| `max-width` | 最大宽度 |
| `stretchable` | 是否拉伸填满空间 |
| `sortable` | 是否可排序 |
| `resizable` | 是否可调整列宽 |

**C# 设置：**
```csharp
var table = root.Q<MultiColumnListView>("data-table");
table.columns["name-column"].makeCell = () => new Label();
table.columns["name-column"].bindCell = (element, index) =>
    ((Label)element).text = m_data[index].Name;
table.itemsSource = m_data;
```

#### MultiColumnTreeView

多列的层级树（如文件浏览器）。

```xml
<ui:MultiColumnTreeView name="hierarchy-view"
                        fixed-item-height="24"
                        show-border="true">
    <ui:Columns>
        <ui:Column name="name" title="Name" width="200" />
        <ui:Column name="size" title="Size" width="80" />
        <ui:Column name="date" title="Modified" width="120" />
    </ui:Columns>
</ui:MultiColumnTreeView>
```

---

### Tab 元素

#### TabView & Tab

用于在多个内容面板间切换的 Tab 界面。USS 选择器参见 [TabView 与 Tab 样式](#tabview-与-tab-样式)。

```xml
<ui:TabView name="main-tabs" reorderable="false">
    <ui:Tab label="Inventory" name="inventory-tab">
        <ui:ScrollView>
            <ui:Label text="Inventory content here" />
        </ui:ScrollView>
    </ui:Tab>
    <ui:Tab label="Skills" name="skills-tab">
        <ui:Label text="Skills content here" />
    </ui:Tab>
</ui:TabView>

<!-- 带图标 -->
<ui:TabView>
    <ui:Tab label="Home" icon-image="project://database/Assets/Icons/home.png">
        <ui:Label text="Home content" />
    </ui:Tab>
</ui:TabView>

<!-- 可关闭 -->
<ui:TabView>
    <ui:Tab label="Document 1" closeable="true">
        <ui:Label text="Document content" />
    </ui:Tab>
</ui:TabView>
```

**Tab 属性：**
| 属性 | 描述 |
|-----------|-------------|
| `label` | Tab 显示文字 |
| `icon-image` | 图标路径 |
| `closeable` | 是否显示关闭按钮 |
| `view-data-key` | 持久化键 |

---

### 可绑定输入元素

这些元素常通过 `binding-path` 绑定到数据属性：

```xml
<!-- 绑定到 int 属性 -->
<ui:IntegerField label="Health" binding-path="Health" />

<!-- 绑定到 float 属性 -->
<ui:FloatField label="Speed" binding-path="Speed" />

<!-- 绑定到 string 属性 -->
<ui:TextField label="Name" binding-path="PlayerName" />

<!-- 绑定到 bool 属性 -->
<ui:Toggle label="Active" binding-path="IsActive" />

<!-- 绑定 Slider 到 float -->
<ui:Slider label="Volume" low-value="0" high-value="1" binding-path="Volume" />

<!-- ProgressBar 绑定到带显式 BindingMode 的值 -->
<ui:ProgressBar low-value="0" high-value="100" binding-path="HealthPercent">
    <Bindings>
        <ui:DataBinding property="value" binding-mode="ToTarget" />
    </Bindings>
</ui:ProgressBar>
```

---

### 速查表

| 元素 | 用途 | 关键属性 |
|---------|---------|----------------|
| `Label` | 显示文本 | `text` |
| `TextField` | 文本输入 | `value`、`placeholder-text`、`multiline`、`password` |
| `Button` | 可点击操作 | `text` |
| `Toggle` | 复选框 | `label`、`value` |
| `RadioButtonGroup` | 互斥选择 | `value`（索引） |
| `IntegerField` | 整数输入 | `label`、`value` |
| `FloatField` | 小数输入 | `label`、`value` |
| `Slider` | 浮点范围 | `low-value`、`high-value`、`value` |
| `SliderInt` | 整数范围 | `low-value`、`high-value`、`value` |
| `MinMaxSlider` | 范围选择 | `low-limit`、`high-limit`、`min-value`、`max-value` |
| `DropdownField` | 选项列表 | `choices`、`index` |
| `ProgressBar` | 进度显示 | `value`、`high-value`、`title` |
| `Image` | 显示图像 | （通过 C# 或 USS 设置） |
| `ScrollView` | 滚动区域 | `mode`、`*-scroller-visibility` |
| `GroupBox` | 分组容器 | `text` |
| `Foldout` | 可折叠 | `text`、`value`（展开状态） |
| `ListView` | 虚拟化列表 | `fixed-item-height`、`selection-type` |
| `TreeView` | 层级列表 | `fixed-item-height` |
| `MultiColumnListView` | 表格视图 | `<ui:Columns>` 子元素 |
| `TabView` | Tab 容器 | `reorderable` |
| `Tab` | Tab 内容 | `label`、`closeable`、`icon-image` |
| `Box` | 带边框容器 | — |
| `HelpBox` | 信息/警告/错误 | `text`、`message-type` |

---

## 12. 元素查询

### 基础查询

```csharp
// 按 name
var button = root.Q<Button>("submit-button");

// 仅按类型（首个匹配）
var firstLabel = root.Q<Label>();

// 按 USS class
var cards = root.Query<VisualElement>(className: "card").ToList();

// 按 name 和 class 同时
var specificCard = root.Q<VisualElement>("my-card", "card--highlighted");

// 某种类型的所有实例
var allButtons = root.Query<Button>().ToList();

// 链式 —— 在子区域中查找
var panelButton = root.Q<VisualElement>("settings-panel").Q<Button>("close-button");

// 带谓词（避免在热路径中使用 —— 会产生分配）
var activeItems = root.Query<VisualElement>()
    .Where(e => e.ClassListContains("card--active"))
    .ToList();
```

### 空安全

```csharp
var button = root.Q<Button>("optional-button");
if (button != null)
{
    button.clicked += OnClicked;
}

// 一行式空安全调用
root.Q<Button>("optional-button")?.SetEnabled(false);
```

### 缓存查询 —— 绝不要在 Update 中调用

```csharp
// ✅ 好 —— 在 OnEnable 中缓存（推荐用于 UIDocument MonoBehaviour）
private Button m_submitButton;

private void OnEnable()
{
    var root = m_uiDocument.rootVisualElement;
    m_submitButton = root.Q<Button>("submit-button");
    m_submitButton.clicked += OnSubmitClicked;
}

private void OnDisable()
{
    m_submitButton.clicked -= OnSubmitClicked;
}

// ❌ 差 —— 每帧都查询
private void Update()
{
    m_uiDocument.rootVisualElement.Q<Button>("submit-button").SetEnabled(false);
}
```

### 查询时机

```csharp
// ✅ OnEnable 是推荐查询位置。
//    这里 UIDocument 一定已初始化好 rootVisualElement。
private void OnEnable()
{
    var root = m_uiDocument.rootVisualElement;
    m_button = root.Q<Button>("my-button");
    m_button.clicked += OnButtonClicked;
}

private void OnDisable()
{
    m_button.clicked -= OnButtonClicked;
}

/// ⚠️ Awake：若 UIDocument 在同一 GameObject 上（会在 Awake 中同步初始化），
//    此处查询 rootVisualElement 是可以的，但意味着查询和事件订阅会分散在
//    不同的生命周期方法中。
//    推荐在 OnEnable 中统一处理查询与事件注册。
private void Awake()
{
    m_uiDocument = GetComponent<UIDocument>(); // 在 Awake 中查找组件没问题
}

// ✅ CreateGUI 是 EditorWindow 的正确入口
public void CreateGUI()
{
    visualTree.CloneTree(rootVisualElement);
    var button = rootVisualElement.Q<Button>(); // 这里总是安全的
}
```

---

## 13. 显示/隐藏模式

### display 属性（脱离布局）

```csharp
// 隐藏 —— 脱离布局（元素不占空间）
element.style.display = DisplayStyle.None;

// 显示 —— 回到布局
element.style.display = DisplayStyle.Flex;

// 辅助方法
public void SetPanelVisible(bool isVisible)
{
    m_panel.style.display = isVisible ? DisplayStyle.Flex : DisplayStyle.None;
}
```

### visibility 属性（保留布局空间）

```csharp
// 隐藏但保留空间
element.style.visibility = Visibility.Hidden;

// 显示
element.style.visibility = Visibility.Visible;
```

> 想让元素完全不参与布局时使用 `display`；需要保留空间（例如避免布局抖动）时使用 `visibility`。

---

## 14. 按钮与事件处理

### 按钮点击事件

```csharp
private Button m_actionButton;

private void OnEnable()
{
    var root = m_uiDocument.rootVisualElement;
    m_actionButton = root.Q<Button>("action-button");
    m_actionButton.clicked += OnActionButtonClicked;
}

private void OnDisable()
{
    // 始终取消订阅，避免内存泄漏
    m_actionButton.clicked -= OnActionButtonClicked;
}

private void OnActionButtonClicked()
{
    Debug.Log("Action button clicked");
}
```

### 启用/禁用按钮

```csharp
button.SetEnabled(false);  // 禁用（置灰）
button.SetEnabled(true);   // 启用

if (button.enabledSelf) { /* 按钮已启用 */ }
```

### 其它事件类型

```csharp
// 通用事件注册
button.RegisterCallback<ClickEvent>(OnClick);

// 指针事件
element.RegisterCallback<PointerEnterEvent>(evt => Debug.Log("Mouse entered"));
element.RegisterCallback<PointerLeaveEvent>(evt => Debug.Log("Mouse left"));

// 值变化
textField.RegisterValueChangedCallback(evt =>
{
    Debug.Log($"Value changed to {evt.newValue}");
});
slider.RegisterValueChangedCallback(evt =>
{
    Debug.Log($"Changed: {evt.previousValue} → {evt.newValue}");
});

// 键盘
element.RegisterCallback<KeyDownEvent>(evt =>
{
    if (evt.keyCode == KeyCode.Return) Submit();
});

// 事件传播
button.RegisterCallback<ClickEvent>(evt =>
{
    evt.StopPropagation();
});

// 清理 —— MonoBehaviour 用 OnDisable，EditorWindow 用 OnDestroy
private void OnDisable()
{
    button.clicked -= OnButtonClicked;
    button.UnregisterCallback<ClickEvent>(OnClick);
}
```

### 使用 EventRegistry（项目标准）

项目中的 `EventRegistry` 工具（位于 `GameSystems` 命名空间）提供集中清理 —— 优先使用它而不是手动订阅/取消订阅：

```csharp
using GameSystems;

private readonly EventRegistry m_eventRegistry = new();

private void OnEnable()
{
    m_eventRegistry.RegisterCallback<ClickEvent>(m_submitButton, OnSubmitClicked);
    m_eventRegistry.RegisterCallback<ClickEvent>(m_cancelButton, OnCancelClicked);
    m_eventRegistry.RegisterValueChangedCallback<float>(m_volumeSlider, OnVolumeChanged);
}

private void OnDisable()
{
    m_eventRegistry.Dispose(); // 一次性取消所有注册
}
```

---

## 15. ListView 与模板生成

### VisualTreeAsset 实例化（手动网格/列表）

```csharp
public class CardGridController : MonoBehaviour
{
    [SerializeField] private UIDocument m_uiDocument;
    [SerializeField] private VisualTreeAsset m_cardTemplate;
    [SerializeField] private List<CardDataSO> m_cards;

    private VisualElement m_cardContainer;

    private void OnEnable()
    {
        var root = m_uiDocument.rootVisualElement;
        m_cardContainer = root.Q<VisualElement>("card-container");
        PopulateCards();
    }

    private void PopulateCards()
    {
        m_cardContainer.Clear();

        foreach (var cardData in m_cards)
        {
            // 实例化模板
            var cardElement = m_cardTemplate.Instantiate();

            // 通过查询或数据绑定填充
            cardElement.Q<Label>("card-title").text = cardData.Title;
            cardElement.Q<Label>("card-cost").text = cardData.Cost.ToString();
            cardElement.dataSource = cardData;

            // 设置按钮（捕获循环变量）
            var data = cardData;
            var actionButton = cardElement.Q<Button>("action-button");
            if (actionButton != null)
            {
                actionButton.clicked += () => OnCardActionClicked(data);
            }

            m_cardContainer.Add(cardElement);
        }
    }

    private void OnCardActionClicked(CardDataSO cardData)
    {
        Debug.Log($"Card clicked: {cardData.Title}");
    }
}
```

### 使用 makeItem/bindItem 的 ListView（虚拟化）

```csharp
private void SetupListView()
{
    m_listView.makeItem = () => m_itemTemplate.Instantiate();

    m_listView.bindItem = (element, index) =>
    {
        var item = m_items[index];
        element.Q<Label>("item-name").text = item.ItemName;
        element.Q<Label>("item-cost").text = $"{item.Cost} gold";
        element.dataSource = item;
    };

    m_listView.itemsSource = m_items;
}

// 数据变化时刷新
public void RefreshList() => m_listView.RefreshItems();
```

**ListView UXML：**
```xml
<ui:ListView name="inventory-list"
             fixed-item-height="60"
             virtualization-method="FixedHeight"
             selection-type="Single" />
```

---

## 16. TabView 与 Tab 样式

### USS 选择器

```css
/* TabView 容器 */
.unity-tab-view { }
.unity-tab-view__content-container { }

/* Tab 头部 */
.unity-tab { }
.unity-tab__header { }
.unity-tab__header:checked { }      /* 激活的 Tab */
.unity-tab__header:hover { }
.unity-tab__header-label { }
.unity-tab__header-underline { }
```

### 定制 Tab 样式

```css
.unity-tab__header {
    background-color: rgb(230, 230, 230);
    padding: 10px 20px;
    border-radius: 4px 4px 0 0;
    -unity-font-style: bold;
    color: rgb(0, 0, 0);
}

.unity-tab__header:checked {
    background-color: rgb(100, 150, 200);
    color: rgb(255, 255, 255);
}

.unity-tab__header:hover {
    background-color: rgb(200, 200, 200);
}

/* 隐藏下划线 */
.unity-tab__header-underline {
    opacity: 0;
}
```

### C# Tab 事件

```csharp
private TabView m_tabView;

private void OnEnable()
{
    m_tabView = root.Q<TabView>("main-tabs");
    m_tabView.activeTabChanged += OnActiveTabChanged;
}

private void OnDisable()
{
    m_tabView.activeTabChanged -= OnActiveTabChanged;
}

private void OnActiveTabChanged(Tab previousTab, Tab newTab)
{
    Debug.Log($"Tab changed to {newTab?.label}");
}
```

---

## 17. 自定义 VisualElement —— **按版本选 API**

> **重要**：`[UxmlElement]` / `[UxmlAttribute]` **仅 Unity 6+**。Unity 2022 及更早必须用 `UxmlFactory` / `UxmlTraits`（旧标准 API，仍受支持）。

### ✅ 全版本通用：`UxmlFactory` / `UxmlTraits` 写法（推荐用于 Unity 2022）

```csharp
using UnityEngine.UIElements;

public class HealthBar : VisualElement
{
    public new class UxmlFactory : UxmlFactory<HealthBar, UxmlTraits> { }
    public new class UxmlTraits : VisualElement.UxmlTraits
    {
        private UxmlFloatAttributeDescription m_maxHealth = new()
            { name = "max-health", defaultValue = 100f };

        public override void Init(VisualElement ve, IUxmlAttributes bag, CreationContext cc)
        {
            base.Init(ve, bag, cc);
            ((HealthBar)ve).maxHealth = m_maxHealth.GetValueFromBag(bag, cc);
        }
    }

    private float m_maxHealth = 100f;
    public float maxHealth
    {
        get => m_maxHealth;
        set
        {
            m_maxHealth = value;
            // ... 刷新 UI
        }
    }

    public HealthBar()
    {
        // ... 构造
    }
}
```

> Unity 6 起，下方 `[UxmlElement]` 写法是更新的官方推荐。但 Unity 2022 及更早**必须**用上方 `UxmlFactory` 写法。

### ❌ 仅 Unity 6+：`[UxmlElement]` 写法

```csharp
// ❌ 仅 Unity 6+ —— Unity 2022 及更早版本不能使用
[UxmlElement]
public partial class HealthBar : VisualElement
{
    [UxmlAttribute]
    public float maxHealth { get; set; } = 100f;
    // ...
}
```

🟡 **Unity 6 有更简洁的新方式（UxmlFactory 仍兼容但非首选）：**
```csharp
// Unity 6 之前 —— 不要这样写
public new class UxmlFactory : UxmlFactory<MyElement, UxmlTraits> { }
public new class UxmlTraits : VisualElement.UxmlTraits
{
    public override void Init(VisualElement ve, IUxmlAttributes bag, CreationContext cc) { }
}
```

✅ **统一使用 —— Unity 6.3 API：**
```csharp
using UnityEngine.UIElements;

/// <summary>
/// 可直接在 UXML 中使用的自定义血条元素。
/// </summary>
[UxmlElement]
public partial class HealthBar : VisualElement
{
    // 在 UXML 中作为属性暴露 —— Unity 6.3 会自动生成注册代码
    [UxmlAttribute]
    public float maxHealth { get; set; } = 100f;

    [UxmlAttribute]
    public string label { get; set; } = "HP";

    private Label m_label;
    private VisualElement m_fill;

    public HealthBar()
    {
        AddToClassList("health-bar");

        m_label = new Label(label);
        m_label.AddToClassList("health-bar__label");

        m_fill = new VisualElement();
        m_fill.AddToClassList("health-bar__fill");

        Add(m_label);
        Add(m_fill);
    }

    public void SetValue(float current)
    {
        float pct = Mathf.Clamp01(current / maxHealth) * 100f;
        m_fill.style.width = Length.Percent(pct);
    }
}
```

在 UXML 中使用：
```xml
<MyNamespace.HealthBar max-health="100" label="HP" name="player-health" />
```

---

## 18. 数据绑定（**Unity 6+** 专属）

> **重要**：运行时数据绑定（`INotifyBindablePropertyChanged` / `[CreateProperty]` / `SetBinding()`）**仅 Unity 6 及以上版本支持**。Unity 2022 及更早版本请使用替代方案（见下方）。

Unity 6 引入了完整的**运行时**数据绑定系统。这与仅限 Editor 的 `SerializedObject.Bind()` 完全不同。

### ⚠️ Unity 2022 及更早版本：替代方案

如果工程是 Unity 2022 或更早版本（**没有运行时数据绑定**），请使用以下替代方案：

```csharp
// Unity 2022 推荐写法：手动订阅 INotifyPropertyChanged
using System.ComponentModel;
using System.Runtime.CompilerServices;

public class PlayerDataSO : ScriptableObject, INotifyPropertyChanged
{
    public event PropertyChangedEventHandler PropertyChanged;

    [SerializeField] private int m_health = 100;
    public int Health
    {
        get => m_health;
        set
        {
            if (m_health != value)
            {
                m_health = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Health)));
            }
        }
    }
}
```

在 C# 中手动订阅：
```csharp
// Unity 2022
private void OnEnable()
{
    m_playerData.PropertyChanged += OnDataChanged;
    m_playerData.PropertyChanged += (s, e) =>
    {
        if (e.PropertyName == nameof(PlayerDataSO.Health))
            m_healthBar.value = m_playerData.Health;
    };
}
```

> 升级到 Unity 6 后，可使用下方原方案（`INotifyBindablePropertyChanged` + `SetBinding`）。

### 响应式数据源（运行时更新）—— **Unity 6+**

实现 `INotifyBindablePropertyChanged` 以使 UI 在数据运行时变化时自动更新：

```csharp
using System;
using Unity.Properties;
using UnityEngine;
using UnityEngine.UIElements; // INotifyBindablePropertyChanged 与 BindablePropertyChangedEventArgs 所需

[CreateAssetMenu(fileName = "PlayerData", menuName = "Game Data/Player")]
public class PlayerDataSO : ScriptableObject, INotifyBindablePropertyChanged
{
    public event EventHandler<BindablePropertyChangedEventArgs> propertyChanged;

    [SerializeField] private int m_health = 100;
    [SerializeField] private string m_playerName = "Player";

    [CreateProperty]
    public int Health
    {
        get => m_health;
        set
        {
            if (m_health != value)
            {
                m_health = value;
                Notify(nameof(Health));
            }
        }
    }

    [CreateProperty]
    public string PlayerName
    {
        get => m_playerName;
        set
        {
            if (m_playerName != value)
            {
                m_playerName = value;
                Notify(nameof(PlayerName));
            }
        }
    }

    private void Notify(string propertyName)
    {
        propertyChanged?.Invoke(this, new BindablePropertyChangedEventArgs(propertyName));
    }
}
```

> ⚠️ **若没有 `INotifyBindablePropertyChanged`**，绑定只会在首次赋值时更新 —— 后续的数据变化不会反映到 UI。

### 简单数据源（只读 / 一次性）

对于静态或一次性的绑定，不需要 `INotifyBindablePropertyChanged`：

```csharp
using Unity.Properties;
using UnityEngine;

[CreateAssetMenu(fileName = "ItemData", menuName = "Game Data/Item")]
public class ItemDataSO : ScriptableObject
{
    [SerializeField] private string m_itemName;
    [SerializeField] private int m_cost;

    [CreateProperty]
    public string ItemName => m_itemName;

    [CreateProperty]
    public int Cost => m_cost;
}
```

此模式适用于数据在运行时不会变化，或你手动重新赋值 `dataSource` 来触发刷新的场景。

### 在 UXML 中绑定

```xml
<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:VisualElement data-source-type="PlayerDataSO, Assembly-CSharp" name="player-panel">
        <ui:Label binding-path="PlayerName" name="name-label" />
        <ui:ProgressBar binding-path="Health" low-value="0" high-value="100" />
    </ui:VisualElement>
</ui:UXML>
```

> ⚠️ `binding-path` **区分大小写** —— 必须与 C# 中的属性名完全一致。

### 在 C# 中设置数据源

```csharp
public class UIController : MonoBehaviour
{
    [SerializeField] private UIDocument m_uiDocument;
    [SerializeField] private PlayerDataSO m_playerData;

    private void OnEnable()
    {
        var root = m_uiDocument.rootVisualElement;
        var playerPanel = root.Q<VisualElement>("player-panel");

        // 赋值 dataSource —— 解析 UXML 中的所有 binding-path 声明
        playerPanel.dataSource = m_playerData;
    }
}
```

### 通过 SetBinding() 手动绑定（C#）

对于没有在 UXML 中声明的程序化绑定：

```csharp
using UnityEngine.UIElements;
using Unity.Properties;

var label = root.Q<Label>("player-name");

// 单向：数据 → UI
label.SetBinding("text", new DataBinding
{
    dataSourcePath = new PropertyPath(nameof(PlayerDataSO.PlayerName)),
    bindingMode = BindingMode.ToTarget
});

// 双向绑定
var slider = root.Q<Slider>("health-bar");
slider.SetBinding("value", new DataBinding
{
    dataSourcePath = new PropertyPath(nameof(PlayerDataSO.Health)),
    bindingMode = BindingMode.TwoWay
});
```

### 绑定模式

| 模式 | 方向 | 适用场景 |
|---|---|---|
| `BindingMode.ToTarget` | 数据 → UI | 仅显示（血条、分数显示） |
| `BindingMode.ToSource` | UI → 数据 | 需要写回数据的输入 |
| `BindingMode.TwoWay` | 双向 | 设置、可编辑字段 |
| `BindingMode.ToTargetOnce` | 数据 → UI（仅一次） | 仅初始值，不再更新 |

---

## 19. 数据绑定 — Editor / SerializedObject

`SerializedObject.Bind()` **仅用于 Editor 窗口与自定义 Inspector**。它在运行时无效。

❌ **运行时 UIDocument 绝不要使用 `SerializedObject.Bind()`：**
```csharp
// 对运行时而言错误 —— 仅 Editor API
var so = new SerializedObject(targetObject);
rootVisualElement.Bind(so);
```

✅ **仅在 Editor 窗口中使用：**
```csharp
// 正确 —— 仅在 EditorWindow 或自定义 Inspector 上下文中
var so = new SerializedObject(targetObject);
rootVisualElement.Bind(so);

// 将特定 property 绑定到特定字段
var property = so.FindProperty("fieldName");
var field = new PropertyField(property);
field.BindProperty(property);
rootVisualElement.Add(field);
```

运行时 UI 请使用 `SetBinding()` 与 `binding-path` —— 参见上文 [数据绑定（Unity 6+）](#数据绑定unity-6)。

---

## 20. 常用模式与示例

### 全屏 UI

```xml
<ui:VisualElement name="root" style="flex-grow: 1;">
    <!-- 内容 -->
</ui:VisualElement>
```

### 头部 / 内容 / 底部

```xml
<ui:VisualElement style="flex-grow: 1;">
    <ui:VisualElement class="header" style="height: 60px;" />
    <ui:VisualElement class="content" style="flex-grow: 1;" />
    <ui:VisualElement class="footer" style="height: 40px;" />
</ui:VisualElement>
```

### 居中模态框

```css
.overlay {
    position: absolute;
    left: 0; top: 0; right: 0; bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
}

.modal {
    width: 400px;
    background-color: rgb(255, 255, 255);
    border-radius: 8px;
    padding: 20px;
}
```

### 两栏布局

```xml
<ui:VisualElement style="flex-direction: row; flex-grow: 1;">
    <ui:VisualElement class="sidebar" style="width: 200px;" />
    <ui:VisualElement class="main-content" style="flex-grow: 1;" />
</ui:VisualElement>
```

---

## 21. 基于数据绑定的 MVP 设计模式

本节演示一种简洁的 **Model-View-Presenter（MVP）** 架构，使用 Unity 6 运行时数据绑定，将数据（Model）、UI 显示（View）与游戏逻辑（Presenter）解耦。

### View 命名约定

**View 类以 `*View` 后缀结尾**，以便将 UI 表示层类与控制器区分开：

| 类类型 | 示例 | 位置 | 职责 |
|------------|---------|----------|-----------------|
| View | `BuildingsView.cs` | `Assets/UI Toolkit/Scripts/Map/` | UI 显示与事件订阅（继承 `UITKBaseClass`） |
| View | `DiplomacyView.cs` | `Assets/UI Toolkit/Scripts/Diplomacy/` | 渲染关系数据、订阅外交事件 |
| View | `ArmyRecruitView.cs` | `Assets/UI Toolkit/Scripts/Army/` | 显示可招募单位、处理招募 UI |
| Presenter/Controller | `BuildingsController.cs` | `Assets/Scripts/Map/` | 游戏逻辑、数据操作、事件编排 |
| Presenter/Controller | `DiplomacyController.cs` | `Assets/Scripts/Diplomacy/` | 管理关系、条约、AI 决策 |
| Model | `FactionDataSO.cs` | `Assets/Scripts/Core/` | 纯数据 —— 不含 UI 或逻辑 |

**为何使用此约定？**
- ✅ 立即传达："这个类负责 UI 表示"
- ✅ 易于与 Controller/Presenter（包含游戏逻辑）区分
- ✅ 与行业 MVP/MVC 约定保持一致
- ✅ 所有 `*View` 类都继承 `UITKBaseClass`，并使用模板方法模式

**View 职责（纯 MVP View）：**
- 通过 `InitializeElements()` 缓存 UI 元素引用
- 订阅事件以响应式更新
- 从数据源填充 UI
- 通过事件将用户输入反馈给 Presenter
- **不包含业务逻辑** —— 只负责 UI 渲染和事件处理

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                          架构                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    dataSource    ┌──────────────────────┐    │
│  │    MODEL     │ ───────────────▶ │        VIEW          │    │
│  │ （数据类）    │                  │ （MonoBehaviour +     │    │
│  │              │ ◀─────────────── │  UIDocument + UXML）  │    │
│  └──────────────┘  INotifyBindable │                      │    │
│         ▲          PropertyChanged └──────────────────────┘    │
│         │                                    │                  │
│         │ 修改                                │ 用户输入         │
│         │                                    ▼                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  PRESENTER / CONTROLLER                   │  │
│  │                （MonoBehaviour —— 游戏逻辑）                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 完整示例：玩家属性面板

#### 2. Model（数据类）

```csharp
// PlayerStatsModel.cs
using System;
using Unity.Properties;
using UnityEngine;
using UnityEngine.UIElements; // INotifyBindablePropertyChanged 与 BindablePropertyChangedEventArgs 所需

namespace Game.Models
{
    /// <summary>
    /// Model：持有玩家属性数据并支持响应式绑定。
    /// </summary>
    [CreateAssetMenu(fileName = "PlayerStats", menuName = "Game Data/Player Stats")]
    public class PlayerStatsModel : ScriptableObject, INotifyBindablePropertyChanged
    {
        public event EventHandler<BindablePropertyChangedEventArgs> propertyChanged;

        [Header("Stats Configuration")]
        [SerializeField] private int m_maxHealth = 100;
        [SerializeField] private int m_maxStamina = 100;

        [Header("Current Values")]
        [SerializeField] private int m_currentHealth = 100;
        [SerializeField] private int m_currentStamina = 100;
        [SerializeField] private int m_gold = 0;
        [SerializeField] private string m_playerName = "Hero";

        [CreateProperty]
        public int MaxHealth => m_maxHealth;

        [CreateProperty]
        public int MaxStamina => m_maxStamina;

        [CreateProperty]
        public int CurrentHealth
        {
            get => m_currentHealth;
            set
            {
                int clampedValue = Mathf.Clamp(value, 0, m_maxHealth);
                if (m_currentHealth != clampedValue)
                {
                    m_currentHealth = clampedValue;
                    Notify(nameof(CurrentHealth));
                    Notify(nameof(HealthPercent)); // 派生属性也要通知
                }
            }
        }

        [CreateProperty]
        public int CurrentStamina
        {
            get => m_currentStamina;
            set
            {
                int clampedValue = Mathf.Clamp(value, 0, m_maxStamina);
                if (m_currentStamina != clampedValue)
                {
                    m_currentStamina = clampedValue;
                    Notify(nameof(CurrentStamina));
                    Notify(nameof(StaminaPercent));
                }
            }
        }

        [CreateProperty]
        public int Gold
        {
            get => m_gold;
            set
            {
                if (m_gold != value)
                {
                    m_gold = Mathf.Max(0, value);
                    Notify(nameof(Gold));
                }
            }
        }

        [CreateProperty]
        public string PlayerName
        {
            get => m_playerName;
            set
            {
                if (m_playerName != value)
                {
                    m_playerName = value;
                    Notify(nameof(PlayerName));
                }
            }
        }

        // 进度条用的派生属性（0-100 范围）
        [CreateProperty]
        public float HealthPercent => m_maxHealth > 0 ? (float)m_currentHealth / m_maxHealth * 100f : 0f;

        [CreateProperty]
        public float StaminaPercent => m_maxStamina > 0 ? (float)m_currentStamina / m_maxStamina * 100f : 0f;

        private void Notify(string propertyName)
        {
            propertyChanged?.Invoke(this, new BindablePropertyChangedEventArgs(propertyName));
        }

        public void ResetStats()
        {
            CurrentHealth = m_maxHealth;
            CurrentStamina = m_maxStamina;
        }
    }
}
```

#### 3. View（UI 控制器）

```csharp
// PlayerStatsView.cs
using GameSystems;
using UnityEngine;
using UnityEngine.UIElements;

namespace Game.Views
{
    /// <summary>
    /// View：处理玩家属性的 UI 显示与用户输入。
    /// </summary>
    [RequireComponent(typeof(UIDocument))]
    public class PlayerStatsView : MonoBehaviour
    {
        [Header("Data Source")]
        [SerializeField] private PlayerStatsModel m_playerStats;

        [Header("References")]
        [SerializeField] private PlayerStatsPresenter m_presenter;

        private UIDocument m_uiDocument;
        private VisualElement m_rootPanel;
        private Button m_healButton;
        private Button m_damageButton;
        private Button m_restButton;

        // EventRegistry 自动处理清理 —— 避免 lambda 无法反注册的问题
        private readonly EventRegistry m_eventRegistry = new();

        private void Awake()
        {
            m_uiDocument = GetComponent<UIDocument>();
        }

        private void OnEnable()
        {
            // 在 OnEnable 中查询元素 —— UIDocument 在此一定已就绪
            var root = m_uiDocument.rootVisualElement;
            m_rootPanel = root.Q<VisualElement>("player-stats-panel");

            if (m_rootPanel != null && m_playerStats != null)
            {
                m_rootPanel.dataSource = m_playerStats;
            }

            m_healButton = root.Q<Button>("heal-button");
            m_damageButton = root.Q<Button>("damage-button");
            m_restButton = root.Q<Button>("rest-button");

            if (m_healButton != null)
                m_eventRegistry.RegisterCallback<ClickEvent>(m_healButton, OnHealClicked);
            if (m_damageButton != null)
                m_eventRegistry.RegisterCallback<ClickEvent>(m_damageButton, OnDamageClicked);
            if (m_restButton != null)
                m_eventRegistry.RegisterCallback<ClickEvent>(m_restButton, OnRestClicked);
        }

        private void OnDisable()
        {
            m_eventRegistry.Dispose(); // 一次性取消所有回调
        }

        private void OnHealClicked(ClickEvent evt) => m_presenter?.OnHealClicked();
        private void OnDamageClicked(ClickEvent evt) => m_presenter?.OnDamageClicked();
        private void OnRestClicked(ClickEvent evt) => m_presenter?.OnRestClicked();

        public void ShowPanel(bool show)
        {
            if (m_rootPanel != null)
            {
                m_rootPanel.style.display = show ? DisplayStyle.Flex : DisplayStyle.None;
            }
        }
    }
}
```

#### 4. Presenter（游戏逻辑）

```csharp
// PlayerStatsPresenter.cs
using UnityEngine;

namespace Game.Presenters
{
    /// <summary>
    /// Presenter：包含玩家属性的游戏逻辑。
    /// 响应游戏事件与用户操作，修改 Model。
    /// </summary>
    public class PlayerStatsPresenter : MonoBehaviour
    {
        [Header("Model Reference")]
        [SerializeField] private PlayerStatsModel m_playerStats;

        [Header("Game Settings")]
        [SerializeField] private int m_healAmount = 25;
        [SerializeField] private int m_damageAmount = 10;
        [SerializeField] private int m_staminaCost = 15;

        private void Start()
        {
            m_playerStats?.ResetStats();
        }

        public void OnHealClicked()
        {
            if (m_playerStats == null) return;

            if (m_playerStats.CurrentStamina >= m_staminaCost)
            {
                m_playerStats.CurrentHealth += m_healAmount;
                m_playerStats.CurrentStamina -= m_staminaCost;
            }
            else
            {
                Debug.Log("Not enough stamina to heal!");
            }
        }

        public void OnDamageClicked()
        {
            if (m_playerStats == null) return;

            m_playerStats.CurrentHealth -= m_damageAmount;

            if (m_playerStats.CurrentHealth <= 0)
            {
                OnPlayerDeath();
            }
        }

        public void OnRestClicked()
        {
            if (m_playerStats == null) return;

            m_playerStats.CurrentStamina = m_playerStats.MaxStamina;
        }

        public void ApplyDamage(int amount)
        {
            if (m_playerStats == null) return;

            m_playerStats.CurrentHealth -= amount;

            if (m_playerStats.CurrentHealth <= 0)
            {
                OnPlayerDeath();
            }
        }

        public void AddGold(int amount)
        {
            if (m_playerStats == null) return;

            m_playerStats.Gold += amount;
        }

        private void OnPlayerDeath()
        {
            Debug.Log("Player has died!");
        }
    }
}
```

#### 5. UXML（带绑定的 UI 布局）

```xml
<!-- PlayerStatsPanel.uxml -->
<ui:UXML xmlns:ui="UnityEngine.UIElements" editor-extension-mode="False">
    <Style src="project://database/Assets/UI/Styles/PlayerStats.uss" />

    <ui:VisualElement name="player-stats-panel"
                      class="stats-panel"
                      data-source-type="Game.Models.PlayerStatsModel, Assembly-CSharp">

        <ui:Label name="player-name" class="stats-panel__title" binding-path="PlayerName">
            <Bindings>
                <ui:DataBinding property="text" binding-mode="ToTarget" />
            </Bindings>
        </ui:Label>

        <!-- 血条 -->
        <ui:VisualElement class="stats-panel__stat-row">
            <ui:Label text="Health" class="stats-panel__label" />
            <ui:ProgressBar name="health-bar"
                            class="stats-panel__progress stats-panel__progress--health"
                            low-value="0"
                            high-value="100"
                            binding-path="HealthPercent">
                <Bindings>
                    <ui:DataBinding property="value" binding-mode="ToTarget" />
                </Bindings>
            </ui:ProgressBar>
            <ui:Label name="health-text" class="stats-panel__value">
                <Bindings>
                    <ui:DataBinding property="text"
                                    data-source-path="CurrentHealth"
                                    binding-mode="ToTarget" />
                </Bindings>
            </ui:Label>
        </ui:VisualElement>

        <!-- 体力条 -->
        <ui:VisualElement class="stats-panel__stat-row">
            <ui:Label text="Stamina" class="stats-panel__label" />
            <ui:ProgressBar name="stamina-bar"
                            class="stats-panel__progress stats-panel__progress--stamina"
                            low-value="0"
                            high-value="100"
                            binding-path="StaminaPercent">
                <Bindings>
                    <ui:DataBinding property="value" binding-mode="ToTarget" />
                </Bindings>
            </ui:ProgressBar>
            <ui:Label name="stamina-text" class="stats-panel__value">
                <Bindings>
                    <ui:DataBinding property="text"
                                    data-source-path="CurrentStamina"
                                    binding-mode="ToTarget" />
                </Bindings>
            </ui:Label>
        </ui:VisualElement>

        <!-- 金币显示 -->
        <ui:VisualElement class="stats-panel__stat-row">
            <ui:Label text="Gold" class="stats-panel__label" />
            <ui:Label name="gold-value" class="stats-panel__value stats-panel__value--gold">
                <Bindings>
                    <ui:DataBinding property="text"
                                    data-source-path="Gold"
                                    binding-mode="ToTarget" />
                </Bindings>
            </ui:Label>
        </ui:VisualElement>

        <!-- 操作按钮 -->
        <ui:VisualElement class="stats-panel__buttons">
            <ui:Button name="heal-button" text="Heal" class="stats-panel__button" />
            <ui:Button name="damage-button" text="Take Damage" class="stats-panel__button" />
            <ui:Button name="rest-button" text="Rest" class="stats-panel__button" />
        </ui:VisualElement>

    </ui:VisualElement>
</ui:UXML>
```

#### 6. USS（样式）

```css
/* PlayerStats.uss */
.stats-panel {
    padding: 16px;
    background-color: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    min-width: 300px;
}

.stats-panel__title {
    font-size: 24px;
    -unity-font-style: bold;
    color: rgb(255, 255, 255);
    margin-bottom: 16px;
    -unity-text-align: middle-center;
}

.stats-panel__stat-row {
    flex-direction: row;
    align-items: center;
    margin-bottom: 8px;
}

.stats-panel__label {
    width: 80px;
    color: rgb(200, 200, 200);
    font-size: 14px;
}

.stats-panel__progress {
    flex-grow: 1;
    height: 20px;
    margin: 0 8px;
}

.stats-panel__progress--health .unity-progress-bar__progress {
    background-color: rgb(200, 50, 50);
}

.stats-panel__progress--stamina .unity-progress-bar__progress {
    background-color: rgb(50, 150, 50);
}

.stats-panel__value {
    width: 50px;
    color: rgb(255, 255, 255);
    -unity-text-align: middle-right;
}

.stats-panel__value--gold {
    color: rgb(255, 215, 0);
    -unity-font-style: bold;
}

.stats-panel__buttons {
    flex-direction: row;
    justify-content: space-around;
    margin-top: 16px;
}

.stats-panel__button {
    padding: 8px 16px;
    background-color: rgb(60, 60, 60);
    border-radius: 4px;
    color: rgb(255, 255, 255);
}

.stats-panel__button:hover {
    background-color: rgb(80, 80, 80);
}
```

### 关键要点

1. **Model 实现 `INotifyBindablePropertyChanged`** —— 运行时数据变化时 UI 自动更新所必需
2. **所有可绑定属性都加上 `[CreateProperty]`** —— 让属性对绑定系统可见
3. **在属性 setter 中调用 `Notify()`** —— 触发 UI 更新
4. **在 View 中设置 `dataSource`** —— 将 Model 连接到 UXML 绑定
5. **View 将用户输入转发给 Presenter** —— 保持关注点分离
6. **Presenter 只修改 Model** —— UI 通过绑定自动更新

---

## 22. 性能建议

1. **在 `OnEnable` 中缓存 VisualElement 引用** —— 绝不要在 `Update` 中调用 `Q<>()`；相比 `Awake` 更推荐 `OnEnable`，让查询与事件订阅在同一个方法中
2. **使用 USS class** 而不是内联 `element.style.*` 来改样式 —— USS 是批量应用、经过优化的
3. **使用 `ListView`** 来处理超过 ~20 项的列表 —— 虚拟化渲染避免离屏项的每帧开销
4. **避免在每帧或频繁执行的代码中调用 `Query<>().ToList()`** —— 会产生 GC 分配
5. **使用 USS 变量**管理颜色与尺寸 —— 减少冗余，便于主题化
6. **尽量减少 UXML 嵌套** —— 每一层都增加遍历开销
7. **避免每帧切换 `display: none`** —— 若元素必须留在布局中，请改用 `visibility: hidden`
8. **使用 `EventRegistry`** 统一清理 —— 避免手动维护订阅/取消订阅

---

## 23. 常见错误速查

| ❌ 错误 | ✅ 正确 | 说明 |
|----------|-----------|-------|
| `color: #FF0000;` | `color: rgb(255, 0, 0);` | Unity 2022 及更早不支持十六进制，推荐用 rgb() |
| `text-align: center;` | `-unity-text-align: middle-center;` | 需要 Unity 前缀 |
| `font-weight: bold;` | `-unity-font-style: bold;` | 属性名不同 |
| `background: url(...)` | `background-image: url(...)` | 无简写形式 |
| `element.visible = false` | `element.style.display = DisplayStyle.None` | 使用 style 属性 |
| `binding-path="health"` | `binding-path="Health"` | 区分大小写 |
| `button.onClick += ...` | `button.clicked += ...` | 使用 `clicked` |
| `button.enabled = false` | `button.SetEnabled(false)` | 使用方法 |
| 缺少 `[CreateProperty]` | 添加 `[CreateProperty]` | 绑定所必需 |
| 缺少 `INotifyBindablePropertyChanged` | 实现该接口 | 响应式更新所必需 |
| `root.Q("name")` | `root.Q<VisualElement>("name")` | 始终带上类型 |
| 在 `Awake` 中查询 + 订阅 | 在 `OnEnable` 中查询并订阅 | 保持生命周期一致；`OnEnable` 与 `OnDisable` 配对做清理 |
| 未取消订阅事件 | 在 `OnDisable` 中取消订阅 | 避免内存泄漏 |
| `element.Add(template)` | `element.Add(template.Instantiate())` | 必须调用 `Instantiate()` |
| `navBarMenu` | `navbar-menu` | 使用 kebab-case |
| `navbar-item` | `navbar-menu__item` | 使用 BEM 的 `__` |
| `display: grid` | 仅使用 flexbox | USS 不支持 CSS grid |
| `calc(50% - 10px)` | 硬编码或用 `flex-grow` | USS 不支持 `calc()` |
| `UxmlFactory`/`UxmlTraits` | `[UxmlElement]` / `[UxmlAttribute]` | Unity 6 推荐新方式（旧API仍兼容） |
| 运行时 MonoBehaviour 用 `OnDestroy` | 用 `OnDisable` | `OnDestroy` 触发过晚 |
| 运行时用 `SerializedObject.Bind()` | `binding-path` + `dataSource` | 仅 Editor API |

---

## 24. 故障排查

### 绑定未更新

1. ✅ 属性已加 `[CreateProperty]`
2. ✅ 类已实现 `INotifyBindablePropertyChanged`
3. ✅ 属性变化时调用了 `Notify()`
4. ✅ 已在 C# 中赋值 `dataSource`
5. ✅ `binding-path` 与属性名完全一致（区分大小写）

### 元素不可见

1. 检查 `display` 不为 `None`
2. 检查 `visibility` 不为 `Hidden`
3. 检查父级有 `flex-grow: 1` 或显式尺寸
4. 打开 **UI Toolkit Debugger**（Window → UI Toolkit → Debugger）

### 按钮无响应

1. 确认在 `OnEnable`（而不是构造器）中订阅
2. 检查未被禁用（`button.SetEnabled(false)`）
3. 检查没有覆盖元素拦截指针事件
4. 检查 `picking-mode` 为 `position`（不是 `ignore`）

### 查询返回 null

1. 确认 UXML 中已设置 `name` 属性
2. 在 `OnEnable` 中查询（UIDocument 场景下不要在 `Awake`）
3. 使用正确的类型（`Q<Button>` 而非 `Q<VisualElement>`）
4. 检查拼写 —— name 匹配区分大小写

### 模板未渲染

1. `VisualTreeAsset` 已在 Inspector 中赋值
2. 添加到层级前先调用 `Instantiate()`
3. 在 Console 中检查 UXML 解析错误

### ListView 不显示

1. 已设置 `itemsSource`
2. 已同时赋值 `makeItem` 与 `bindItem`
3. 数据变化后调用了 `RefreshItems()`

### USS 未生效

1. USS 已在 UXML 中通过 `<Style src="..." />` 引用
2. class 名严格匹配（区分大小写）
3. 用 UI Toolkit Debugger 检查计算后的样式

---
