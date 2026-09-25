import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function json(file, issues) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch { issues.push(`无法读取 JSON：${file}`); return null; }
}

async function regularFile(file, issues) {
  try {
    if ((await lstat(file)).isFile()) return true;
  } catch { /* 统一报告不存在或非普通文件。 */ }
  issues.push(`缺少普通文件：${file}`);
  return false;
}

export async function validateCodexPlugin(root = defaultRoot) {
  const issues = [];
  const marketplace = await json(path.join(root, ".agents/plugins/marketplace.json"), issues);
  const entries = marketplace?.plugins;
  if (!Array.isArray(entries) || entries.length !== 1) {
    issues.push("插件市场应包含一个 AgentRuleKit 插件入口");
  }
  const entry = Array.isArray(entries) ? entries[0] : null;
  if (entry?.name !== "agent-rule-kit" || entry?.source?.source !== "local" ||
      entry?.source?.path !== "./plugins/agent-rule-kit") {
    issues.push("插件市场名称或本地路径不符合预期");
  }
  const pluginRoot = path.join(root, "plugins/agent-rule-kit");
  const manifest = await json(path.join(pluginRoot, ".codex-plugin/plugin.json"), issues);
  const project = await json(path.join(root, "package.json"), issues);
  if (manifest?.name !== entry?.name || manifest?.version !== project?.version ||
      manifest?.skills !== "./skills/") {
    issues.push("插件名称、版本或 Skills 路径与仓库入口不一致");
  }

  const skillsRoot = path.join(pluginRoot, "skills");
  let skillEntries = [];
  try { skillEntries = await readdir(skillsRoot, { withFileTypes: true }); }
  catch { issues.push(`无法读取 Skills 目录：${skillsRoot}`); }
  if (skillEntries.length === 0) issues.push("插件至少需要一个 Skill");
  for (const skill of skillEntries) {
    if (!skill.isDirectory()) { issues.push(`Skills 目录存在非目录项：${skill.name}`); continue; }
    const file = path.join(skillsRoot, skill.name, "SKILL.md");
    if (!await regularFile(file, issues)) continue;
    const content = await readFile(file, "utf8");
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    if (!frontmatter || !frontmatter.split(/\r?\n/).some((line) => line === `name: ${skill.name}`) ||
        !frontmatter.split(/\r?\n/).some((line) => /^description:\s*\S/.test(line))) {
      issues.push(`Skill 缺少匹配目录名的 name 或非空 description：${skill.name}`);
    }
  }

  const hookFile = path.join(pluginRoot, "hooks/hooks.json");
  const hooks = await json(hookFile, issues);
  const sessionStart = hooks?.hooks?.SessionStart;
  if (!Array.isArray(sessionStart) || sessionStart.length === 0 ||
      !sessionStart.some((group) => group.hooks?.some((hook) =>
        hook.type === "command" && hook.command === 'node "${PLUGIN_ROOT}/hooks/session_start.mjs"'))) {
    issues.push("插件缺少指向现有 SessionStart 脚本的 Hook 声明");
  }
  await regularFile(path.join(pluginRoot, "hooks/session_start.mjs"), issues);
  return issues;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = await validateCodexPlugin();
  if (issues.length) {
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
  } else {
    console.log("Codex 插件静态结构校验通过（不等同于安装验收）");
  }
}
