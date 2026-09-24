import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRulepacksRoot = path.join(repositoryRoot, "rulepacks");
const PACK_ID = /^[a-z0-9][a-z0-9/-]*$/;
const MANIFEST_FIELDS = new Set(["$schema", "id", "version", "status", "kind", "entry", "dependencies", "rules"]);

function isInside(root, target) {
  return target === root || target.startsWith(`${root}${path.sep}`);
}

function safeRelativeFile(value) {
  return typeof value === "string" && value.length > 0 && !/[\\:\0]/.test(value) &&
    !path.posix.isAbsolute(value) && value.split("/").every((part) => part && part !== "." && part !== "..");
}

async function inventory(root) {
  const manifests = [];
  const markdown = [];
  const unsafe = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) unsafe.push(file);
      else if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && entry.name === "pack.json") manifests.push(file);
      else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") markdown.push(file);
    }
  }
  await visit(root);
  return { manifests, markdown, unsafe };
}

function markdownAnchors(content) {
  const anchors = new Set();
  const occurrences = new Map();
  let fence = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*(?:```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const base = match[1].replace(/`([^`]*)`/g, "$1").replace(/<[^>]+>/g, "")
      .toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s+/g, "-");
    if (!base) continue;
    const count = occurrences.get(base) ?? 0;
    anchors.add(count ? `${base}-${count}` : base);
    occurrences.set(base, count + 1);
  }
  return anchors;
}

async function checkLinks(file, content, root, issues, readCached, owners, dependencies) {
  let fence = false;
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (/^\s*(?:```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const visible = line.replace(/`[^`]*`/g, "");
    const links = visible.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^"']+["'])?\)/g);
    for (const link of links) {
      const raw = link[1].startsWith("<") && link[1].endsWith(">") ? link[1].slice(1, -1) : link[1];
      if (/^[a-z][a-z\d+.-]*:/i.test(raw) || raw.startsWith("#") || raw.includes("<") || raw.includes(">")) continue;
      let decoded;
      try { decoded = decodeURIComponent(raw); }
      catch { issues.push(`${path.relative(root, file)}:${index + 1} 链接编码不合法：${raw}`); continue; }
      const [withoutFragment, fragment] = decoded.split("#", 2);
      const localPath = withoutFragment.split("?", 1)[0];
      const target = localPath ? path.resolve(path.dirname(file), localPath) : file;
      if (!isInside(root, target)) {
        issues.push(`${path.relative(root, file)}:${index + 1} 链接越出规则源：${raw}`);
        continue;
      }
      const targetContent = await readCached(target);
      if (targetContent === undefined) {
        issues.push(`${path.relative(root, file)}:${index + 1} 本地链接目标不存在：${raw}`);
      } else if (fragment && target.endsWith(".md") && !markdownAnchors(targetContent).has(fragment)) {
        issues.push(`${path.relative(root, file)}:${index + 1} 标题锚点不存在：${raw}`);
      }
      const sourcePack = owners.get(file);
      const targetPack = owners.get(target);
      if (sourcePack && targetPack && sourcePack !== targetPack && !dependencies.get(sourcePack)?.has(targetPack)) {
        issues.push(`${path.relative(root, file)}:${index + 1} 跨规则包链接缺少必需依赖：${sourcePack} -> ${targetPack}`);
      }
    }
  }
}

export async function validateRulepacks(root = defaultRulepacksRoot, expectedVersion) {
  const resolvedRoot = path.resolve(root);
  const canonicalRoot = await realpath(resolvedRoot);
  const issues = [];
  const { manifests, markdown, unsafe } = await inventory(resolvedRoot);
  for (const file of unsafe) issues.push(`规则源包含符号链接：${path.relative(resolvedRoot, file)}`);
  const packs = new Map();
  const fileCache = new Map();
  const readCached = async (file) => {
    if (!fileCache.has(file)) {
      try {
        const canonicalFile = await realpath(file);
        fileCache.set(file, isInside(canonicalRoot, canonicalFile) ? await readFile(file, "utf8") : undefined);
      }
      catch { fileCache.set(file, undefined); }
    }
    return fileCache.get(file);
  };
  for (const manifestPath of manifests) {
    const id = path.relative(resolvedRoot, path.dirname(manifestPath)).split(path.sep).join("/");
    if (!PACK_ID.test(id) || id.includes("//")) { issues.push(`规则包 ID 不合法：${id}`); continue; }
    let pack;
    try { pack = JSON.parse(await readFile(manifestPath, "utf8")); }
    catch { issues.push(`规则包 manifest 无法解析：${id}`); continue; }
    if (!pack || typeof pack !== "object" || Array.isArray(pack)) { issues.push(`规则包 manifest 必须是对象：${id}`); continue; }
    for (const field of Object.keys(pack)) if (!MANIFEST_FIELDS.has(field)) issues.push(`规则包 manifest 包含未知字段：${id}/${field}`);
    if (pack.$schema !== undefined && typeof pack.$schema !== "string") issues.push(`规则包 schema 声明不合法：${id}`);
    packs.set(id, pack);
    if (pack.id !== id) issues.push(`规则包 ID 与目录不一致：${id}`);
    if (pack.status !== "ready") issues.push(`规则包未处于 ready 状态：${id}`);
    if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(pack.version ?? "")) issues.push(`规则包版本不合法：${id}`);
    if (expectedVersion && pack.version !== expectedVersion) issues.push(`规则包版本与 CLI 不一致：${id} (${pack.version} != ${expectedVersion})`);
    if (!["common", "development", "documentation"].includes(pack.kind)) issues.push(`规则包类型不合法：${id}`);
    if (!Array.isArray(pack.rules) || !Array.isArray(pack.dependencies)) { issues.push(`规则包列表字段不合法：${id}`); continue; }
    if (pack.rules.length === 0) issues.push(`规则包没有规则文件：${id}`);
    if (new Set(pack.rules).size !== pack.rules.length) issues.push(`规则包有重复规则路径：${id}`);
    if (new Set(pack.dependencies).size !== pack.dependencies.length) issues.push(`规则包有重复依赖：${id}`);
    if (!safeRelativeFile(pack.entry) || !pack.entry.endsWith(".md") || !pack.rules.includes(pack.entry)) issues.push(`规则包入口不安全或未列入规则清单：${id}`);
    for (const dependency of pack.dependencies) if (typeof dependency !== "string" || !PACK_ID.test(dependency) || dependency.includes("//") || dependency.endsWith("/")) issues.push(`规则包依赖 ID 不合法：${id} -> ${String(dependency)}`);
    for (const rule of pack.rules) {
      if (!safeRelativeFile(rule) || !rule.endsWith(".md")) { issues.push(`规则包路径不安全：${id}/${String(rule)}`); continue; }
      const file = path.join(path.dirname(manifestPath), rule);
      if (await readCached(file) === undefined) issues.push(`规则包规则文件不存在：${id}/${rule}`);
    }
  }
  const declaredFiles = new Set();
  const owners = new Map();
  for (const [id, pack] of packs) {
    if (!Array.isArray(pack.dependencies) || !Array.isArray(pack.rules)) continue;
    for (const dependency of pack.dependencies) if (!packs.has(dependency)) issues.push(`规则包依赖不存在：${id} -> ${dependency}`);
    const directory = path.join(resolvedRoot, id);
    for (const rule of pack.rules) if (safeRelativeFile(rule)) {
      const file = path.join(directory, rule);
      declaredFiles.add(file);
      owners.set(file, id);
    }
  }
  for (const file of markdown) {
    if (!declaredFiles.has(file)) issues.push(`规则文件未列入任何 manifest：${path.relative(resolvedRoot, file)}`);
  }
  const visited = new Set();
  const visiting = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) { issues.push(`规则包依赖形成循环：${id}`); return; }
    visiting.add(id);
    for (const dependency of packs.get(id)?.dependencies ?? []) if (packs.has(dependency)) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of packs.keys()) visit(id);
  const dependencies = new Map();
  for (const id of packs.keys()) {
    const reachable = new Set();
    const pending = [...(packs.get(id)?.dependencies ?? [])];
    while (pending.length) {
      const dependency = pending.pop();
      if (!packs.has(dependency) || reachable.has(dependency)) continue;
      reachable.add(dependency);
      pending.push(...(packs.get(dependency)?.dependencies ?? []));
    }
    dependencies.set(id, reachable);
  }
  for (const file of markdown) await checkLinks(file, await readCached(file), resolvedRoot, issues, readCached, owners, dependencies);
  return { packs: packs.size, files: markdown.length, issues };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8")).version;
  const result = await validateRulepacks(defaultRulepacksRoot, version);
  if (result.issues.length) {
    for (const issue of result.issues) console.error(issue);
    console.error(`规则源校验失败：${result.issues.length} 项问题`);
    process.exitCode = 1;
  } else {
    console.log(`规则源校验通过：${result.packs} 个规则包，${result.files} 个 Markdown 文件`);
  }
}
