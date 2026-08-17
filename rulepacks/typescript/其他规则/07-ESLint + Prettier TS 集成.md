# 07 - ESLint + Prettier TS 集成

> - 🟢 本文件适用于项目已经采用 ESLint 和/或 Prettier 时的 TypeScript 集成；具体版本、配置格式和命令以仓库现状为准。
> - 🔴 不适用：业务逻辑实现、UI 样式设计

---

## 1. 🔴 硬约束 · 这些绝对不要写

### 1.1 ESLint 负责 TS lint 却没有 TS 解析与规则支持

```bash
# 仅在项目已采用该组合、获得授权且准备更新 lockfile 时执行；旧版项目可继续保留能工作的既有配置
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# 若项目明确选择当前 typescript-eslint + flat config，才评估一站式包
npm install --save-dev eslint typescript-eslint
```

只有当 ESLint 实际负责解析和检查 `.ts`/`.tsx` 时，才需要选择与现有 ESLint 版本兼容的 TypeScript 支持。Biome、Oxlint 或项目已有其他工具链不应被本节替换。

### 1.2 不加范围评估地关闭类型化规则

```js
// ❌ 关闭 no-unsafe-* 规则(失去类型 lint 意义)
{
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
  }
}
```

类型化规则能发现更多问题，但会依赖 `tsconfig` 并增加执行成本。应根据源码/测试/生成文件范围配置；不要为了压掉单个告警而全局关闭，也不要把它强加给尚未具备类型化 lint 条件的项目。

### 1.3 ESLint 与 Prettier 规则冲突

```js
// ❌ ESLint 自己处理格式(与 Prettier 冲突)
{
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  }
}
```

若项目选择 Prettier，通常让 ESLint 管逻辑、Prettier 管格式，并使用 `eslint-config-prettier` 处理冲突；未采用 Prettier 的项目应遵循已有格式化工具和规则。

## 2. 🟡 推荐 · 团队约定

### 2.1 typescript-eslint 关键规则（按项目启用）

下例适用于已经采用最新版 `typescript-eslint`、使用 flat config 且需要类型化 lint 的项目。生成代码、测试工具配置和性能敏感的超大仓库通常需要单独的 files/ignores 范围。

```js
// eslint.config.js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.strictTypeChecked,           // 可作为严格类型化 lint 的起点
  {
    languageOptions: {
      parserOptions: {
        projectService: true,                      // 自动发现 tsconfig
      },
    },
    rules: {
      // ====== any 控制 ======
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // ====== Promise / async ======
      '@typescript-eslint/no-floating-promises': 'error',         // await 必须
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/return-await': 'error',

      // ====== 类型使用 ======
      '@typescript-eslint/consistent-type-imports': 'error',      // import type
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/consistent-type-definitions': 'error',

      // ====== 函数 / 模块 ======
      '@typescript-eslint/no-non-null-assertion': 'error',        // 禁用 !
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-shadow': 'error',
    },
  },
);
```

### 2.2 Flat Config（ESLint 9+ 示例）

仅在项目已使用 ESLint 9+ 与 `typescript-eslint` 时，可按实际框架增量采用。React 插件不能出现在非 React 项目的基础配置中：

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    ignores: ['dist/', 'build/', 'node_modules/', 'coverage/', '*.config.js'],
  },
  prettierConfig,                                    // 仅项目使用 Prettier 时保留
  {
    rules: {
      // 项目自定义规则
    },
  },
);
```

### 2.3 Prettier 与 ESLint 分工

| 工具 | 职责 |
|------|------|
| **Prettier** | 缩进 / 引号 / 分号 / 行宽 / 尾随逗号 / 折行 |
| **ESLint** | 未使用变量 / 潜在 bug / 风格细节（如 `eqeqeq`） |

**协作**：装 `eslint-config-prettier`，关闭 ESLint 中与 Prettier 冲突的规则。

### 2.4 提交前检查（lint-staged + husky）

仅在项目已经使用或明确决定采用 Git hooks 时配置；CI 仍应保留独立验证，不能依赖开发者本地 hook。

```json
// package.json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged

# .husky/commit-msg
npx --no-install commitlint --edit "$1"
```

### 2.5 忽略文件

```js
// eslint.config.js
{
  ignores: [
    'dist/**',
    'build/**',
    'node_modules/**',
    'coverage/**',
    '*.config.js',                                   // 构建配置文件
    'src/types/global.d.ts',                          // 类型声明文件
  ],
}
```

### 2.6 VS Code 集成

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,                       // 保存时格式化
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"]
}
```

## 3. 🟢 可选 · 视情况

### 3.1 类型化 lint 与 CI 卡口

```yaml
# .github/workflows/ci.yml
- name: Lint
  run: npm run lint
- name: Type check
  run: npm run typecheck
- name: Test
  run: npm run test
```

### 3.2 import 排序

```bash
# 项目已采用该插件或明确授权引入时才执行
npm install --save-dev eslint-plugin-simple-import-sort
```

```js
{
  rules: {
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
  },
}
```

自动排序：内置 → 第三方 → 内部。

### 3.3 禁止 console / debugger（发布配置）

```js
{
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
  },
}
```

### 3.4 React 项目额外规则

```bash
# 仅适用于已采用 React 且明确授权引入这些插件的项目
npm install --save-dev eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
```

```js
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  ...tseslint.configs.strictTypeChecked,
  reactHooksPlugin.configs['recommended-latest'],   // React Hooks 规则
  {
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
```

---
