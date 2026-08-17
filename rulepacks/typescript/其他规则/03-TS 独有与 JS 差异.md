# 03 - TypeScript 独有与 JS 差异

> - 🟢 本文件适用于 TypeScript 独有的语法规范（类型注解/比较运算/装饰器等）。
> - 🔴 不适用：业务逻辑实现、UI 样式设计

---

## 1. 🔴 硬约束 · 这些绝对不要写

### 1.1 保留 JS 的隐式风险

```ts
// ❌ == 隐式转换
if (count == '5') { /* 类型不一致仍 true */ }

// ❌ arguments(deopt + 类型难)
function sum() {
  return Array.prototype.reduce.call(arguments, (a, b) => a + b, 0);
}

// ❌ with / eval(运行时禁用)
with (obj) { name = 'a'; }
eval('name = "a"');

// ❌ 全局变量污染
name = 'alice';                                     // 隐式全局

// ✅ === / rest / 显式声明
if (count === 5) { /* ... */ }
function sum(...nums: number[]) { return nums.reduce((a, b) => a + b, 0); }
```

### 1.2 没有类型注解

```ts
// ❌ 完全依赖推断(库代码不可用)
export function getUser(id) { /* ... */ }

// ✅ 函数参数 / 返回类型必加
export function getUser(id: number): Promise<User | null> { /* ... */ }
```

**规则**：

| 场景 | 是否必加类型 |
|------|------------|
| 库 / 公共 API | ✅ 显式参数 + 返回类型 |
| 业务函数参数 | ✅ 显式参数类型（返回可推断） |
| 业务函数返回 | 🟡 可推断；长函数 / 公共方法显式 |
| 内部局部变量 | ❌ 依赖推断 |

### 1.3 any 替代 unknown

```ts
// ❌ any 关闭类型检查
function parse(input: any): User { return JSON.parse(input); }

// ✅ unknown + 运行时守卫
function parse(input: unknown): User {
  if (typeof input !== 'string') throw new Error('Expected string');
  const value: unknown = JSON.parse(input);
  if (!isUser(value)) throw new Error('Invalid user payload');
  return value;
}
```

详见 [02 §硬约束 1](./02-类型守卫与收窄.md)。

### 1.4 对象 / 数组类型用 any

```ts
// ❌
const config: any = {};
const items: any[] = [];

// ✅ interface / Record
interface Config { apiUrl: string; timeout: number; }
const config: Config = { apiUrl: '...', timeout: 5000 };

// ✅ 数组泛型
const items: User[] = [];
const items: Array<User> = [];
const items: readonly User[] = Object.freeze([]);    // 不变
```

### 1.5 函数 this 丢失

```ts
// ❌ this 类型隐式 any
class Counter {
  count = 0;
  increment() {
    setTimeout(function () {
      this.count++;                                   // ❌ this 是 undefined
    }, 1000);
  }
}

// ✅ 箭头函数(继承外层 this)
increment() {
  setTimeout(() => {
    this.count++;                                    // ✅
  }, 1000);
}

// ✅ TS 显式声明 this 类型
interface CounterThis { count: number }
function increment(this: CounterThis) {
  this.count++;
}
```

### 1.6 async / await 错误处理

```ts
// ❌ Promise 未指定泛型
async function getUser(id) {                        // Promise<any>
  return await fetch(`/api/users/${id}`).then(r => r.json());
}

// ✅ 显式返回类型 + catch 子句用 unknown
async function getUser(id: number): Promise<User> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e: unknown) {
    if (e instanceof Error) throw e;
    throw new Error('Unknown error');
  }
}
```

### 1.7 import 不区分类型和值

```ts
// ❌ 全部用 import(运行时仍加载类型 import)
import { User, getUser } from './user';

// ✅ 类型 import 用 import type
import type { User } from './user';
import { getUser } from './user';

// ✅ 内联 type 导入
import { type User, getUser } from './user';
```

**配置 tsconfig**：

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,                     // 强制显式 type 导入
    "isolatedModules": true
  }
}
```

## 2. 🟡 推荐 · 团队约定

### 2.1 const 断言与字面量

```ts
// ❌ 反复声明字面量类型
const STATUS: { Pending: 'pending'; Done: 'done' } = { Pending: 'pending', Done: 'done' };

// ✅ as const 一次搞定
const STATUS = { Pending: 'pending', Done: 'done' } as const;
type Status = typeof STATUS[keyof typeof STATUS];   // 'pending' | 'done'
```

### 2.2 命名空间 vs ESM

**现代 TS 用 ESM**，namespace 仅用于类型声明合并：

```ts
// ✅ namespace 仅用于类型合并
namespace MyLib {
  export interface Config {}
  export function setup(c: Config) {}
}

// ❌ 用 namespace 装运行时(不推荐)
namespace MyLib {
  export const VERSION = '1.0.0';                   // 用 ES module 替代
}
```

### 2.3 declare / ambient

**全局扩展**：

```ts
// src/types/global.d.ts
declare global {
  interface Window {
    myApp: { version: string };
  }
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}
export {};                                           // 标记为模块
```

**模块声明**：

```ts
// src/types/css-modules.d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

### 2.4 标准装饰器与 legacy decorators

- 🔴 先检查 TypeScript 版本、`experimentalDecorators`、框架编译链和现有装饰器签名；标准装饰器与 legacy decorators 的类型和运行时语义不同，不能机械迁移。
- 🟡 TypeScript 5.0+ 支持标准装饰器语法，但具体能力仍受 target、lib、emit 和框架约束；使用下面的标准方法装饰器签名时不得套用 legacy 的 descriptor 参数。

```ts
function loggedMethod<This, Args extends unknown[], Result>(
  originalMethod: (this: This, ...args: Args) => Result,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Result
  >,
) {
  return function (this: This, ...args: Args): Result {
    console.log(`Calling ${String(context.name)}`);
    return originalMethod.call(this, ...args);
  };
}

class Calculator {
  @loggedMethod
  add(a: number, b: number) { return a + b; }
}
```

- 🟡 项目因 Angular、NestJS、ORM、metadata 或既有库继续使用 legacy decorators 时，沿用其锁定版本与配置；迁移需要单独授权和回归计划。

### 2.5 默认导出 vs 具名导出

**具名优先**（与 [01-代码编写规则](../../javascript/其他规则/01-代码编写规则.md) 一致）：

```ts
// ✅
export interface User {}
export function getUser() {}

// ❌ 默认导出整个对象
export default { User, getUser };
```

### 2.6 函数重载（声明 + 实现）

```ts
// ✅ 声明多个签名
function process(input: string): string;
function process(input: number): number;
function process(input: string | number): string | number {
  return typeof input === 'string' ? input.trim() : input * 2;
}
```

## 3. 🟢 可选 · 视情况

### 3.1 模板字面量类型（已在 [01 §可选 3](./01-类型系统.md)）

### 3.2 import assertions / attributes（TS 5.3+）

```ts
// JSON module
import config from './config.json' with { type: 'json' };

// CSS module
import styles from './styles.module.css' with { type: 'css' };
```

### 3.3 satisfies（已在 [01 §可选 1](./01-类型系统.md)）

### 3.4 const 类型参数（已在 [01 §可选 2](./01-类型系统.md)）

---
