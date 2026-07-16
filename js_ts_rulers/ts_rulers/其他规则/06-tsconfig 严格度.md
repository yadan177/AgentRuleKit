# 06 - tsconfig 严格度

> 🟢 本文件适用于 tsconfig.json 的严格度配置。

> 🔴 不适用：业务逻辑实现、UI 样式设计

---

## 1. 🔴 硬约束 · 这些绝对不要写

### 1.1 没有迁移计划地关闭严格检查

```jsonc
// ❌ 已采用严格检查的项目不要为绕过单个错误而整体关闭
{
  "compilerOptions": {
    "strict": false
  }
}
```

`strict: false` 会关闭严格选项族的默认值（单独显式设置的选项仍可覆盖），很容易掩盖空值和隐式类型问题。遗留项目若需要逐步迁移，应记录范围、负责人和回收计划，而不是把它当作修复报错的快捷方式。

### 1.2 隐式 any

```ts
function add(a, b) { return a + b; }                  // ❌ 参数隐式 any
```

`noImplicitAny: true` 强制显式 `any` / 真实类型（`strict: true` 已包含）。

### 1.3 宽松 null 检查

```ts
function getName(user: User) {
  return user.name.toUpperCase();                     // ❌ user 可能 undefined
}

function getName(user: User | null) {
  return user.name.toUpperCase();                     // ❌ strictNullChecks 报错
}
```

`strictNullChecks: true` 强制显式处理 null/undefined（`strict: true` 已包含）。

### 1.4 索引访问不检查

```ts
const arr = [1, 2, 3];
const x = arr[10];                                   // TS 推断 number，实际 undefined
console.log(x.toFixed(2));                           // ❌ 运行时崩
```

启用 `noUncheckedIndexedAccess: true` 后，索引访问会变成 `T | undefined`；是否启用应结合现有数组/字典代码的迁移成本决定。

### 1.5 可选属性绕过 undefined

```ts
interface User { name?: string }
const u: User = { name: 'alice' };
const n: string = u.name;                            // ❌ name 可能 undefined

// exactOptionalPropertyTypes: true 后
const u: User = { name: undefined };                 // ❌ 不允许显式传 undefined
```

---

## 2. 🟡 推荐 · 团队约定

### 2.1 推荐配置（按项目事实裁剪）

下例适用于新建、前端 bundler 构建、目标运行环境支持 ESM 且团队确认可承受严格迁移成本的项目。库项目、Node 服务、遗留项目或已有继承链应从当前 `tsconfig` 增量调整，不要整体覆盖。

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    // ===== 严格选项 =====
    "strict": true,                                  // 严格选项族的基线；迁移项目可逐项启用

    // ===== 按代码库成熟度和兼容性评估 =====
    "noUncheckedIndexedAccess": true,                // 数组/对象索引返回 T | undefined
    "exactOptionalPropertyTypes": true,              // 可选字段不能显式传 undefined
    "noImplicitOverride": true,                      // class override 必须显式标注
    "noFallthroughCasesInSwitch": true,              // switch case 必 break/return
    "noUnusedLocals": true,                          // 未使用局部变量报错
    "noUnusedParameters": true,                      // 未使用参数报错
    "noPropertyAccessFromIndexSignature": true,      // 必须用 [] 访问索引签名
    "allowUnusedLabels": false,                      // 禁止未使用 label
    "allowUnreachableCode": false,                   // 禁止 unreachable code

    // ===== 模块解析 =====
    "target": "ES2022",                              // 必须与运行环境和产物策略匹配
    "module": "ESNext",                              // bundler 项目的示例
    "moduleResolution": "Bundler",                   // 仅 Vite/Webpack/esbuild 等 bundler 项目
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,                         // 每个文件可独立编译
    "verbatimModuleSyntax": true,                    // 强制显式 type import

    // ===== 库与兼容性 =====
    "lib": ["ES2022", "DOM", "DOM.Iterable"],     // 仅浏览器项目示例
    "skipLibCheck": true,                            // 以第三方声明质量、构建时长和仓库现状决定

    // ===== 输出 =====
    "noEmit": true,                                  // Vite/esbuild 处理 emit
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.cache/tsbuildinfo"
  },
  "include": ["src", "src/types/global.d.ts"],
  "exclude": ["node_modules", "dist", "build"]
}
```

### 2.2 模块解析（按构建工具选）

| 构建工具 | `module` | `moduleResolution` |
|---------|----------|--------------------|
| **Vite / Webpack 5 / esbuild** | `"ESNext"` | `"Bundler"` |
| **Node.js（最新 LTS）** | `"NodeNext"` | `"NodeNext"` |
| **tsc 直接构建** | `"ES2022"` | `"Node"` / `"Node16"` |

### 2.3 目标版本

| 运行环境 | `target` |
|---------|---------|
| 现代浏览器（Chrome 94+ / Safari 16+ / Firefox 93+） | `ES2022` |
| 兼容老浏览器（Chrome 70+） | `ES2020` |
| 最新实验 | `ESNext` |

### 2.4 严格模式下的常见问题

**数组索引访问**：

```ts
const arr = [1, 2, 3];
// ❌ noUncheckedIndexedAccess: true 后
const x = arr[0];                                   // number | undefined
x.toFixed(2);                                        // ❌ 编译报错

// ✅
if (x !== undefined) x.toFixed(2);
const y = arr[0] ?? 0;                               // 默认值
```

**可选属性**：

```ts
interface User { name?: string }
// ❌ exactOptionalPropertyTypes: true 后
const u: User = { name: undefined };                 // ❌

// ✅ 不传或传真实值
const u1: User = {};
const u2: User = { name: 'alice' };
```

**库类型缺失**：

```ts
// ❌ 库没类型
import oldLib from 'no-types-lib';

// ✅ 写 .d.ts（见 [05-声明文件](./05-声明文件.md)）
```

### 2.5 增量编译

```jsonc
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.cache/tsbuildinfo"
  }
}
```

### 2.6 项目引用（Project References）

**monorepo / 多包项目**：

```jsonc
// packages/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,                              // 必须开
    "outDir": "./dist"
  },
  "references": [
    { "path": "../shared" },
    { "path": "../api-client" }
  ]
}
```

```bash
tsc --build                        # 增量构建项目引用
```

### 2.7 path 别名（paths）

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

⚠️ `paths` 仅 TS 解析；运行时 / 构建工具也需要配（Vite 的 `resolve.alias` / Webpack 的 `resolve.alias`）。

---

## 3. 🟢 可选 · 视情况

### 3.1 declaration / declarationMap（库代码）

```jsonc
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

仅发布库时用。

### 3.2 composite / references（大型 monorepo）

见 §6。

### 3.3 多个 tsconfig.json（不同环境）

```
tsconfig.json              # 基础
tsconfig.build.json        # 生产构建（生成 d.ts）
tsconfig.test.json         # 测试环境
tsconfig.node.json         # Node 环境
```

---
