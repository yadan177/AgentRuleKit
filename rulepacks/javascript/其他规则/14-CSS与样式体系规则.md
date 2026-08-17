# 14 - CSS 与样式体系规则

> - 🟢 本文件适用于 CSS 与样式体系选型（Tailwind/CSS-in-JS/CSS Modules）。
> - 🔴 不适用：业务逻辑实现、组件设计

---

## 1. 🔴 硬约束 · 这些绝对不要写

### 1.1 没有边界地混用样式方案

```text
// ❌ 错误：同一个项目 Tailwind + styled-components + CSS Modules 全用，没人能维护
// Button.js
import styled from 'styled-components';
const Btn = styled.button`...`; // 这里用 styled-components

// Card.js
import styles from './Card.module.css'; // 这里用 CSS Modules
<div className={styles.card}>...</div>

// App.js
<div className="flex p-4 bg-red-500">...</div> // 这里又用 Tailwind
```

> 📌 规则：
> - 优先沿用项目现有样式体系，不因本规则引入 Tailwind、CSS-in-JS 或 CSS Modules。
> - 一个项目可以因组件库、遗留模块或渐进迁移同时存在多种方案，但必须明确各自适用目录、优先级、设计 token 来源和退出计划。
> - 新代码遵循所属模块边界；迁移应分阶段验证，不要求一次性重写全项目。

---

### 1.2 !important 滥用（优先级战争）

```css
// ❌ 错误：为了覆盖样式乱加 !important，最后全都是 !important
.btn {
  color: blue !important;
}
.header .btn {
  color: red !important; // 你加我也加，比谁的优先级高
}
#app .header .btn {
  color: green !important; // 最后全是 !important 没人敢改
}
```

> 📌 规则：
> - 优先通过层叠层、选择器边界、组件 API 或 token 解决优先级问题。
> - 覆盖第三方样式、可访问性辅助类等确有必要时可以使用 `!important`，并遵循项目现有约定说明原因。

---

### 1.3 z-index 随便写（没有分层体系）

```css
// ❌ 错误：z-index 乱加，最后不知道谁在谁上面
.modal { z-index: 9999; }
.tooltip { z-index: 10000; } // 比 modal 高
.dropdown { z-index: 99999; } // 我要比 tooltip 更高
.loading { z-index: 999999; } // 大家一起比谁大
/* 最后变成猜数字游戏，谁也不知道谁该在上面 */
```

> 📌 规则：
> - **必须统一 z-index 分层体系**，定义在一个地方
> - 层级值由项目设计系统统一定义；示例数字不能直接作为所有项目的默认值。
> - 数值大小不是问题本身，关键是 stacking context、语义层级与统一 token。

---

### 1.4 内联样式写逻辑样式

```jsx
// ❌ 错误：把所有样式都塞进 style 里,可读性爆炸
<div style={{
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px',
  margin: '8px',
  backgroundColor: isActive ? 'blue' : 'white',
  color: isActive ? 'white' : 'black',
  borderRadius: '4px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
}}>
  把 CSS 全写在 style 里,这和写内联有什么区别？
</div>
```

> 📌 规则：
> - **style 只用来写动态变化的值**（比如 top/left 计算值、动态颜色）
> - 静态样式必须写在 class / styled 里
> - 不按属性数量硬拆；当内联对象重复、难以复用或破坏项目样式体系时再提取。

---

### 1.5 选择器嵌套超过 3 层

```css
// ❌ 错误：嵌套过深，和 HTML 结构强耦合，重构 HTML 就全崩
.page {
  .header {
    .nav {
      .menu {
        .item {
          .link { // 嵌套 6 层了！HTML 一改这里就废
            color: blue;
            &:hover { color: red; }
          }
        }
      }
    }
  }
}
/* 结果：HTML 结构变了，CSS 全错，还不敢删 */
```

> 📌 规则：
> - 嵌套深度是结构耦合信号，不设固定层数门禁。
> - 当选择器依赖具体 DOM 层级、覆盖困难或难以复用时，抽取语义 class、组件或 cascade layer。
> - 不要和 HTML 结构强耦合

---

### 1.6 魔法颜色值（到处写 #fff / #000）

```css
// ❌ 错误：同一个颜色写 100 次，改主题色要全局替换
.btn { background-color: #1890ff; }
.link { color: #1890ff; }
.badge { background-color: #1890ff; }
/* 某天 UI 说主色改成 #1677ff，你得搜整个项目 */
```

> 📌 规则：
> - 需要跨组件或跨页面复用、需要主题切换或需要设计治理的颜色，应统一定义为 token（CSS Variables / Tailwind theme / theme object）。
> - 业务样式优先引用 token；token 定义、一次性原型、第三方内容适配等边界场景可使用字面量，但必须有明确归属，避免无计划地散落复制。
> - 颜色变量名要有语义：`--primary` / `--success` / `--warning`，不要叫 `--blue`

---

### 1.7 全局样式没有命名空间

```css
// ❌ 错误：全局写 .btn / .card，第三方库/别人的代码和你冲突
.btn {
  padding: 8px 16px;
  border-radius: 4px;
}
/* 结果：引入的 UI 库也叫 .btn，样式互相覆盖，谁也说不清 */
```

> 📌 规则：
> - **自定义全局样式必须加命名空间前缀**
> - 比如 `.myapp-btn` / `.acme-card`，不要直接写通用名词
> - 用 CSS-in-JS / CSS Modules 的自动 scoped 最好

## 2. 🟡 推荐 · 这些写法尽量避免

### 2.8 重复的 Tailwind 原子类组合

```jsx
// ❌ 错误：同一个组合的原子类重复写 N 次,改一个地方要改 10 处
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">...</div>
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">...</div>
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">...</div>
/* 每个卡片都写一遍,某天要把 p-4 改成 p-6,你得找全 */
```

```jsx
// ✅ 同一语义结构反复出现时，可按项目约定提取组件
function Card({ children }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
      {children}
    </div>
  );
}

// 项目已经采用并支持 @apply 时，也可以提取样式
.card {
  @apply flex items-center justify-between p-4 bg-white rounded-lg shadow;
}
```

> 📌 规则：是否提取取决于语义复用、变化频率和项目 Tailwind 版本；不以类数量或重复次数作为唯一判断。

---

### 2.9 响应式断点不统一

```css
// ❌ 错误：每个组件自己写断点，最后项目里有 768px / 750px / 800px 各种值
@media (max-width: 768px) { /* ... */ }
@media (max-width: 750px) { /* 另一个组件 */ }
@media (max-width: 800px) { /* 又一个组件 */ }
```

> 📌 规则：
> - **全项目统一断点**，定义在一个地方
> - 推荐：`sm: 640px` / `md: 768px` / `lg: 1024px` / `xl: 1280px`（和 Tailwind 一致）
> - 不要自己发明新的断点值

---

### 2.10 单位混用（px / rem / em 乱换）

```css
// ❌ 错误：同一个组件里 px rem em 混用，没人知道为什么这么写
.card {
  padding: 1rem; // rem
  margin: 16px;  // px
  font-size: 1em; // em
  line-height: 1.5; // 无单位
}
```

> 📌 规则：
> - 项目应统一单位的语义和设计 token，而不是强制所有属性使用同一种单位。
> - 字体和用户缩放通常使用相对单位，像素对齐或媒体资源可使用 `px`，行高通常使用无单位值。
> - 同一组件混用单位本身不是错误；应说明缩放、容器和可访问性依据。

## 3. 📋 样式方案决策依据

已有项目优先沿用所属模块的样式体系。新项目或经授权的迁移应比较具体实现和版本，不能仅凭“原型、组件库、动态样式”标签指定 Tailwind、CSS-in-JS 或 CSS Modules。

| 决策维度 | 必须核对 |
|------|------------|
| 现有体系 | 已安装依赖、设计 token、组件库、目录边界和团队维护经验 |
| 构建与运行模式 | 客户端/SSR/SSG、样式提取、代码分割、运行时注入和缓存策略 |
| 动态样式与主题 | CSS Variables、条件 class、运行时计算、服务端水合和主题切换需求 |
| 性能与安全 | 具体实现的产物大小、运行时成本、CSP、关键 CSS 和目标浏览器验证结果 |
| 迁移成本 | 遗留样式、第三方组件、视觉回归、渐进迁移边界和退出方案 |

同一类别的不同实现可能是零运行时、编译期提取或运行时注入，不能把性能结论固定到“CSS-in-JS”等类别名称上。

## 4. 📌 写样式三原则

1. **可预测**：改一处不影响 N 处，不要写强耦合的选择器
2. **可复用**：按语义、变化频率和项目抽象方式判断是否提取；不以重复次数机械创建抽象
3. **可维护**：不要写"聪明"的选择器，越直白越好，新人一眼能看懂

---

> 本文件只列常见坑，不写完整 CSS 教程。遇到不确定的写法，先查 MDN / 对应方案官方文档，不要猜。
