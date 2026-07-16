# 14 - CSS 与样式体系规则

> 🟢 本文件适用于 CSS 与样式体系选型（Tailwind/CSS-in-JS/CSS Modules）。

> 🔴 不适用：业务逻辑实现、组件设计

---

## 1. 🔴 硬约束 · 这些绝对不要写

### 1.1 多种样式方案混着写（一个项目用N套）

```css
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
> - **一个项目只选一种样式方案**，三选一：Tailwind / CSS-in-JS / CSS Modules
> - 选定了就全项目统一，不要混搭
> - 老项目迁移要做就做全，不要一半一半

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
> - **99% 的场景不应该用 !important**
> - 除非是覆盖第三方库的内联样式，而且没有其他办法
> - 用了 !important 必须写注释说明为什么

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
> - 推荐分层：`100 - dropdown` / `200 - tooltip` / `300 - modal` / `400 - loading`
> - 不要用超过 3 位数的 z-index

---

### 1.4 内联样式写逻辑样式

```jsx
// ❌ 错误：把所有样式都塞进 style 里，可读性爆炸
<div style={{
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px',
  margin: '8px',
  backgroundColor: isActive ? 'blue' : 'white',
  color: isActive ? 'white' : 'black',
  borderRadius: '4px',
  boxShadow: '0 2px 8px rgba（0,0,0,0.1）'
}}>
  把 CSS 全写在 style 里，这和写内联有什么区别？
</div>
```

> 📌 规则：
> - **style 只用来写动态变化的值**（比如 top/left 计算值、动态颜色）
> - 静态样式必须写在 class / styled 里
> - style 里不要超过 3 个属性

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
> - **嵌套不要超过 3 层**
> - 超过了就该抽新的 class / 组件
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

---

## 2. 🟡 推荐 · 这些写法尽量避免

### 2.8 Tailwind 原子类超过 5 个不提取

```jsx
// ❌ 错误：同一个组合的原子类重复写 N 次，改一个地方要改 10 处
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">...</div>
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">...</div>
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">...</div>
/* 每个卡片都写一遍，某天要把 p-4 改成 p-6，你得找全 */
```

```jsx
// ✅ 正确：超过 5 个就提取成组件 / @apply
function Card（{ children }） {
  return （
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
      {children}
    </div>
  ）;
}

// 或者用 @apply
.card {
  @apply flex items-center justify-between p-4 bg-white rounded-lg shadow;
}
```

> 📌 规则：**同一组原子类出现超过 3 次，就该提取**

---

### 2.9 响应式断点不统一

```css
// ❌ 错误：每个组件自己写断点，最后项目里有 768px / 750px / 800px 各种值
@media （max-width: 768px） { ... }
@media （max-width: 750px） { ... } // 另一个组件里
@media （max-width: 800px） { ... } // 又一个
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
> - **全项目统一单位策略**
> - 推荐：字体用 `rem`，布局用 `px`，行高无单位
> - 或者全用 `px` / 全用 `rem`，不要混

---

## 📋 样式方案选型表

| 场景 | 选 Tailwind | 选 CSS-in-JS | 选 CSS Modules |
|------|------------|-------------|---------------|
| 快速原型 / 中小项目 | ✅ 首选 | ⚠️ 可以但没必要 | ⚠️ 可以但没必要 |
| 组件库 / 设计系统 | ⚠️ 需要自定义封装 | ✅ 合适（主题切换方便） | ⚠️ 可以 |
| 大量动态样式 / 主题切换 | ⚠️ 配合 CSS Variables | ✅ 最合适 | ❌ 不方便 |
| 团队习惯写原生 CSS | ⚠️ 需要适应 | ⚠️ JS 思维 | ✅ 最顺手 |
| 性能要求极高（包大小敏感） | ✅ 按需生成，零运行时 | ⚠️ 有运行时开销 | ✅ 零运行时 |

---

## 📌 写样式三原则

1. **可预测**：改一处不影响 N 处，不要写强耦合的选择器
2. **可复用**：重复出现的样式组合一定要提取，不要复制粘贴
3. **可维护**：不要写"聪明"的选择器，越直白越好，新人一眼能看懂

---

> 本文件只列常见坑，不写完整 CSS 教程。遇到不确定的写法，先查 MDN / 对应方案官方文档，不要猜。
