# 07 - ESLint + Prettier TS 集成

> 🟢 本文件适用于 ESLint + Prettier 在 TypeScript 项目中的集成。

> 🔴 不适用：业务逻辑实现、UI 样式设计

---

## 1. 🔴 硬约束 · 这些绝对不要写

### 1.1 没有 typescript-eslint（纯 ESLint 跑 TS）

```bash
# ❌ 旧版 ESLint 6 + 自定义 parser
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# ✅ 现代 flat config（ESLint 9+）+ typescript-eslint 一站式
npm install --save-dev eslint typescript-eslint
```

### 1.2 关闭类型化规则（丧失类型 lint 价值）

```js
// ❌ 关闭 no-unsafe-* 规则（失去类型 lint 意义）
{
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
  }
}
```

类型化规则是 TS 项目相比 JS 项目的核心价值之一——不要关掉。

### 1.3 ESLint 与 Prettier 规则冲突

```js
// ❌ ESLint 自己处理格式（与 Prettier 冲突）
{
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  }
}
```

**ESLint 管逻辑，Prettier 管格式**。格式规则用 `eslint-config-prettier` 关闭。

---

## 2. 🟡 推荐 · 团队约定

### 2.1 typescript-eslint 关键规则（强制开启）

```js
// eslint.config.js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.strictTypeChecked,           // 推荐 strict + type-checked
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

### 2.2 Flat Config（ESLint 9+ 推荐）

**完整配置模板**：

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  reactPlugin.configs.recommended,
  reactHooksPlugin.configs['recommended-latest'],
  jsxA11yPlugin.recommended,
  {
    ignores: ['dist/', 'build/', 'node_modules/', 'coverage/', '*.config.js'],
  },
  prettierConfig,                                    // 关闭 ESLint 与 Prettier 冲突规则
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

---

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
