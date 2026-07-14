#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ruleRoots = ['unity_rulers', 'java_rulers', 'go-rules', 'js_ts_rulers'];
const commonDocuments = ['00-规则文档编写规范/规则文档编写格式规范.md'];
const adapterTargets = [
  { root: 'unity_rulers', target: '.ai-rules/unity/15-AI通用入口规则.md', cursor: 'unity-core.mdc' },
  { root: 'java_rulers', target: '.ai-rules/java/14-AI通用入口规则.md', cursor: 'java-core.mdc' },
  { root: 'go-rules', target: '.ai-rules/go/13-AI通用入口规则.md', cursor: 'go-core.mdc' },
  { root: 'js_ts_rulers', target: '.ai-rules/js-ts/01-AI通用入口规则.md', cursor: 'js-ts-core.mdc' },
];

const failures = [];
const normalMarkdown = [];

function fail(file, message) {
  failures.push(`${path.relative(repositoryRoot, file)}: ${message}`);
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(entryPath);
    else if (entry.isFile() && entry.name.endsWith('.md')) normalMarkdown.push(entryPath);
  }
}

function withoutCode(text) {
  return text
    .replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '')
    .replace(/`[^`]*`/g, '');
}

function validateHeadings(file, text) {
  const lines = text.split(/\r?\n/);
  if (!/^# \d{2} - .+/.test(lines[0] ?? '')) fail(file, '首行必须是两位编号的 H1。');

  let fenced = false;
  const separators = [];
  let firstH2 = -1;
  let h2 = 0;
  let h3 = 0;
  let h4 = 0;

  for (const [index, line] of lines.entries()) {
    if (/^```/.test(line.trim())) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (line.trim() === '---') separators.push(index + 1);
    if (/^## /.test(line) && firstH2 === -1) firstH2 = index;

    let match = line.match(/^## (\d+)\. /);
    if (match) {
      const current = Number(match[1]);
      if (current !== h2 + 1) fail(file, `第 ${index + 1} 行 H2 编号不连续。`);
      h2 = current;
      h3 = 0;
      h4 = 0;
      continue;
    }
    match = line.match(/^### (\d+)\.(\d+) /);
    if (match) {
      const parent = Number(match[1]);
      const current = Number(match[2]);
      if (parent !== h2 || current !== h3 + 1) fail(file, `第 ${index + 1} 行 H3 编号或父级不正确。`);
      h3 = current;
      h4 = 0;
      continue;
    }
    match = line.match(/^#### (\d+)\.(\d+)\.(\d+) /);
    if (match) {
      const first = Number(match[1]);
      const second = Number(match[2]);
      const current = Number(match[3]);
      if (first !== h2 || second !== h3 || current !== h4 + 1) fail(file, `第 ${index + 1} 行 H4 编号或父级不正确。`);
      h4 = current;
    }
  }

  if (separators.length !== 1) fail(file, `代码围栏外必须恰有一个顶部分隔线，当前为 ${separators.length} 个。`);
  if (separators.length === 1 && (firstH2 === -1 || separators[0] - 1 >= firstH2)) {
    fail(file, '顶部分隔线必须位于首个 H2 之前。');
  }
}

function validateLinks(file, text) {
  const content = withoutCode(text);
  const pattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of content.matchAll(pattern)) {
    const rawTarget = match[1].trim();
    if (/^(?:https?:|mailto:|#)/.test(rawTarget)) continue;
    const localTarget = rawTarget.replace(/^<|>$/g, '').split('#')[0];
    if (!localTarget) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(localTarget));
    if (!fs.existsSync(resolved)) fail(file, `本地链接不存在：${rawTarget}`);
  }
}

function validateAdapters() {
  for (const { root, target, cursor } of adapterTargets) {
    const adapterRoot = path.join(repositoryRoot, root, '适配器模板');
    const required = [
      path.join(adapterRoot, 'codex', 'AGENTS.md'),
      path.join(adapterRoot, 'qoder', '.qoder', 'rules', `${cursor.replace('.mdc', '.md')}`),
      path.join(adapterRoot, 'trae', '00-TRAE手动使用说明.md'),
      path.join(adapterRoot, 'cursor', '.cursor', 'rules', cursor),
    ];
    for (const file of required) {
      if (!fs.existsSync(file)) {
        fail(file, '缺少适配器模板文件。');
        continue;
      }
      const text = fs.readFileSync(file, 'utf8');
      if (!text.includes(target)) fail(file, `未定位到唯一通用入口：${target}`);
      if (file.endsWith('.mdc')) {
        if (!text.startsWith('---\n') || !text.includes('\nalwaysApply: true\n')) {
          fail(file, 'Cursor 模板必须保留已验证的 frontmatter 与 alwaysApply。');
        }
      }
    }
  }
}

for (const root of ruleRoots) walk(path.join(repositoryRoot, root));
for (const document of commonDocuments) normalMarkdown.push(path.join(repositoryRoot, document));

for (const file of normalMarkdown) {
  const text = fs.readFileSync(file, 'utf8');
  validateHeadings(file, text);
  validateLinks(file, text);
  const enforceableContent = withoutCode(text)
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('|'))
    .join('\n');
  if (/必须\s*(?:使用)?\s*Unity\s*6/i.test(enforceableContent)) fail(file, '不得把 Unity 6 写成全局前提。');
  if (/所有项目\s*必须\s*(?:升级|使用)/.test(enforceableContent)) fail(file, '不得把升级或技术选择写成所有项目的无条件要求。');
}

validateAdapters();

if (failures.length > 0) {
  console.error(`规则库验收失败：${failures.length} 项`);
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log(`规则库验收通过：${normalMarkdown.length} 个普通 Markdown、${adapterTargets.length} 组适配器。`);
}
