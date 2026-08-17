# 16 - Vue 3 组件规则

> - 🟢 本文件仅适用于项目已经采用 Vue 3 的 JavaScript/TypeScript 组件、页面和相关测试。
> - 🔴 不适用：替代项目已有 Vue 版本、状态方案、路由、构建工具、UI 组件库或测试体系。

---

## 1. 项目事实与边界

- 🔴 开始修改前检查 `package.json`、锁文件、`vite.config.*`/Webpack 配置、`tsconfig*.json`、路由、状态、组件库、测试脚本和同模块既有实现。
- 🔴 只使用项目已声明且已验证的 Vue API；不得因为本文件示例引入 Pinia、Vue Router、Vite、Vitest 或 UI 组件库。
- 🔴 项目已形成约定时，组件目录、命名、状态、样式和测试方式优先于本文件的候选方案。
- 🟡 本专题只负责 Vue 运行时和组件边界；通用异步、网络、安全、性能和 TypeScript 规则按任务从 JS/TS 入口选择。

## 2. Composition API 与 `script setup`

- 🟡 项目采用 Composition API 时，优先按职责组织可复用逻辑；不要为了形式拆出只使用一次的 composable。
- 🟡 项目已使用 `<script setup>` 时，沿用其编译宏和目录约定；不能把 Options API 与 Composition API 混杂为新的默认风格。
- 🔴 `defineProps`、`defineEmits`、`defineExpose` 和 `withDefaults` 的版本可用性以项目 Vue/编译器版本为准。
- 🟡 Vue 3.3+ 支持 `defineEmits<{ change: [enabled: boolean] }>()` 具名元组语法；更早版本使用下面的调用签名形式。
- 🔴 Props 用于输入，Emits 用于向父组件通知；不要通过隐式修改 props 或暴露内部响应式对象绕过边界。

```vue
<script setup lang="ts">
const props = defineProps<{ enabled: boolean }>();
const emit = defineEmits<{
  (event: 'change', enabled: boolean): void;
}>();

function toggle(): void {
  emit('change', !props.enabled);
}
</script>
```

## 3. 响应式状态选择

- 🔴 `ref`、`reactive`、`computed` 和 `watch` 的选择以状态形态和项目既有约定为准，不因偏好全局替换。
- 🟡 `ref` 适合独立值或需要整体替换的状态；`reactive` 适合稳定对象边界，但避免解构丢失响应式。
- 🔴 `computed` 应保持派生和无副作用；写入型 computed 必须明确 setter 的约束和失败语义。
- 🔴 `watch` 只用于副作用或需要观察变化的边界，回调必须处理取消、竞态和组件卸载。
- ❌ 不要把服务端状态、页面状态和组件临时状态无差别提升为全局状态。

## 4. 生命周期与副作用

- 🔴 在 `onMounted`/`onActivated` 中创建的事件监听、定时器、订阅、对象 URL 和请求，必须在对应卸载/停用边界清理或取消。
- 🔴 异步回调恢复时必须确认组件仍有效，并通过项目已有取消模型避免旧请求覆盖新状态。
- 🔴 `onUnmounted` 不是修复所有资源泄漏的兜底；应由创建资源的同一职责边界负责释放。
- 🟡 不要仅为解释生命周期方法逐行添加注释；只注释时序、所有权、兼容和失败语义等非直观原因。

## 5. 路由、状态和数据访问

- 🔴 Vue Router、Pinia 或其他状态方案只有在项目已经采用或用户明确授权时才能使用。
- 🔴 路由守卫中的认证、权限、重定向和异步加载必须沿用项目已有契约；不要在组件中复制鉴权逻辑。
- 🔴 请求取消、重试、缓存、错误和加载状态必须沿用项目数据访问层；不能把示例中的库名当作默认依赖。
- 🔴 跨页面或跨端字段变化要同步类型、请求契约、注释和受影响技术文档。

## 6. TypeScript 与 UI 边界

- 🔴 Props、Emits、插槽和公共 composable 的类型必须与运行时校验和后端契约一致；类型通过不代表外部输入可信。
- 🟡 UI 组件库、CSS Modules、Scoped CSS、Tailwind 或 CSS-in-JS 按项目既有方案选择；不得跨体系混用造成样式所有权不清。
- 🔴 非直观的层叠、响应式断点、浏览器兼容和降级逻辑应写原因注释，不以注释覆盖率为目标。

## 7. 测试与交付检查

- 🔴 使用项目已有的 Vue 组件测试、端到端测试和断言库；没有事实依据时不得假定 Vitest、Vue Test Utils 或其他工具。
- 🔴 至少覆盖组件输入输出、关键状态转移、副作用清理和异步竞态中与本次改动相关的路径。
- 🔴 交付前检查错误、过时和缺失注释，并说明类型检查、构建、组件测试、浏览器联调和真实 API 验证的范围。
