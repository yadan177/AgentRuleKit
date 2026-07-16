#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const errors = [];
const warnings = [];
let legacyTopicCount = 0;

const topicSets = [
  ['Unity', 'unity_rulers/其他规则', 14],
  ['Go', 'go-rules/其他规则', 12],
  ['Java', 'java_rulers/其他规则', 13],
  ['JavaScript', 'js_ts_rulers/js_rulers/其他规则', 14],
  ['TypeScript', 'js_ts_rulers/ts_rulers/其他规则', 8],
];

const requiredFiles = [
  'unity_rulers/00-文档总览.md',
  'unity_rulers/15-AI通用入口规则.md',
  'unity_rulers/适配器模板/00-适配器使用说明.md',
  'unity_rulers/适配器模板/codex/AGENTS.md',
  'unity_rulers/适配器模板/qoder/.qoder/rules/unity-core.md',
  'unity_rulers/适配器模板/trae/00-TRAE手动使用说明.md',
  'go-rules/00-文档总览.md',
  'go-rules/13-AI通用入口规则.md',
  'go-rules/适配器模板/00-适配器使用说明.md',
  'go-rules/适配器模板/codex/AGENTS.md',
  'go-rules/适配器模板/qoder/.qoder/rules/go-core.md',
  'go-rules/适配器模板/trae/00-TRAE手动使用说明.md',
  'java_rulers/00-文档总览.md',
  'java_rulers/14-AI通用入口规则.md',
  'java_rulers/适配器模板/00-适配器使用说明.md',
  'java_rulers/适配器模板/codex/AGENTS.md',
  'java_rulers/适配器模板/qoder/.qoder/rules/java-core.md',
  'java_rulers/适配器模板/trae/00-TRAE手动使用说明.md',
  'js_ts_rulers/js_rulers/00-文档总览.md',
  'js_ts_rulers/js_rulers/15-AI通用入口规则.md',
  'js_ts_rulers/ts_rulers/00-文档总览.md',
  'js_ts_rulers/ts_rulers/09-AI通用入口规则.md',
  'js_ts_rulers/适配器模板/00-适配器使用说明.md',
  'js_ts_rulers/适配器模板/codex/AGENTS.md',
  'js_ts_rulers/适配器模板/qoder/.qoder/rules/js-ts-core.md',
  'js_ts_rulers/适配器模板/trae/00-TRAE手动使用说明.md',
];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function allMarkdownFiles(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];

  const entries = fs.readdirSync(absolute, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return allMarkdownFiles(relative);
    return entry.isFile() && entry.name.endsWith('.md') ? [relative] : [];
  });
}

function localLinks(markdown) {
  const result = [];
  const pattern = /(?<!!)(?:\[[^\]]*\])\(([^)]+)\)/g;
  for (const match of markdown.matchAll(pattern)) {
    let href = match[1].trim();
    if (href.startsWith('<') && href.endsWith('>')) href = href.slice(1, -1);
    if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
    const target = href.split('#', 1)[0].split('?', 1)[0];
    if (target.endsWith('.md')) result.push(target);
  }
  return result;
}

for (const relative of requiredFiles) {
  if (!exists(relative)) fail(`缺少必需入口或适配器：${relative}`);
}

for (const [name, directory, count] of topicSets) {
  const docs = allMarkdownFiles(directory);
  if (docs.length !== count) {
    fail(`${name} 专题规则数量应为 ${count}，实际为 ${docs.length}：${directory}`);
  }

  for (let index = 1; index <= count; index += 1) {
    const prefix = `${String(index).padStart(2, '0')}-`;
    if (!docs.some((doc) => path.basename(doc).startsWith(prefix))) {
      fail(`${name} 缺少专题规则编号 ${String(index).padStart(2, '0')}`);
    }
  }
}

// 当前分支从旧版规则库演进。对旧版专题文档做存在性与篇幅下限检查，
// 防止后续为了“精简”误删整章或大段经验；总览和新增入口不受此阈值约束。
try {
  const trackedFiles = execFileSync('git', ['ls-files', '-z'], { cwd: root })
    .toString('utf8')
    .split('\0')
    .filter((relative) => relative.includes('/其他规则/') && relative.endsWith('.md'));

  for (const relative of trackedFiles) {
    legacyTopicCount += 1;
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) {
      fail(`旧版专题规则被删除：${relative}`);
      continue;
    }

    const baseline = execFileSync('git', ['show', `HEAD:${relative}`], { cwd: root, encoding: 'utf8' });
    const baselineLines = baseline.split(/\r?\n/).length;
    const currentLines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/).length;
    if (currentLines < baselineLines * 0.9) {
      fail(`旧版专题规则疑似被过度缩减：${relative}（${currentLines}/${baselineLines} 行）`);
    }
  }
} catch (error) {
  warn(`未执行旧版保留校验：${error.message}`);
}

const markdownFiles = [
  ...allMarkdownFiles('unity_rulers'),
  ...allMarkdownFiles('go-rules'),
  ...allMarkdownFiles('java_rulers'),
  ...allMarkdownFiles('js_ts_rulers'),
];

for (const relative of markdownFiles) {
  const absolute = path.join(root, relative);
  const content = fs.readFileSync(absolute, 'utf8');
  const lines = content.split(/\r?\n/);
  const firstContentLine = lines.find((line) => line.trim().length > 0);
  if (!firstContentLine?.startsWith('# ')) {
    fail(`${relative} 缺少一级标题`);
  }

  const fences = (content.match(/^\s*```/gm) ?? []).length;
  if (fences % 2 !== 0) fail(`${relative} 的代码围栏未闭合`);

  for (const target of localLinks(content)) {
    const resolved = path.resolve(path.dirname(absolute), target);
    if (!fs.existsSync(resolved)) {
      fail(`${relative} 存在失效本地链接：${target}`);
    }
  }

  if (/\r(?!\n)/.test(content)) warn(`${relative} 包含单独 CR 字符`);
}

const forbiddenPatterns = [
  ['Go 目录作为 gofmt 输入', /\bgofmt -[wl] \.\b/],
  ['Go 目录作为 goimports 输入', /\bgoimports -[wl] \.\b/],
  ['过期 Mockito inline 依赖模板', /<artifactId>mockito-inline<\/artifactId>/],
  ['JWT 绝对排除 CSRF 的表述', /JWT 认证项目[：:]CSRF 不适用/],
  ['TS 规则总数错误', /js_rulers[ 　]*12[ 　]*份[+＋][ 　]*本目录[ 　]*8[ 　]*份，共[ 　]*20[ 　]*份/],
  ['Unity 不存在的查找 API', /FindObjectsOfTypeInactive/],
  ['Unity 协程中直接 await 的旧示例', /IEnumerator\s+ValidateStateLoop[\s\S]{0,400}\bawait\b/],
];

const corpus = markdownFiles
  .map((relative) => [relative, fs.readFileSync(path.join(root, relative), 'utf8')]);

for (const [label, pattern] of forbiddenPatterns) {
  const hit = corpus.find(([, content]) => pattern.test(content));
  if (hit) fail(`发现需回归的规则问题（${label}）：${hit[0]}`);
}

if (errors.length > 0) {
  console.error('规则库校验失败：');
  for (const message of errors) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log(`规则库校验通过：${markdownFiles.length} 个 Markdown 文档，${topicSets.length} 套专题规则，${requiredFiles.length} 个入口/适配器文件，${legacyTopicCount} 个旧版专题已保留。`);
}

if (warnings.length > 0) {
  console.warn('警告：');
  for (const message of warnings) console.warn(`- ${message}`);
}
