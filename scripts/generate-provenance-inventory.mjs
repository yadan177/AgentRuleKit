import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const rulepacksRoot = path.join(repository, "rulepacks");
const outputPath = path.join(repository, "docs", "rulepack-provenance-inventory.md");
const mode = process.argv[2];
if (mode && !["--write", "--check"].includes(mode)) throw new Error(`未知参数：${mode}`);

async function findManifests(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await findManifests(absolutePath));
    else if (entry.isFile() && entry.name === "pack.json") paths.push(absolutePath);
  }
  return paths.sort();
}

function portable(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function externalDomains(content) {
  const domains = new Set();
  for (const match of content.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) {
    try {
      const hostname = new URL(match[0]).hostname.toLowerCase();
      if (!["localhost", "127.0.0.1", "example.com", "example.org", "example.net"].includes(hostname)) domains.add(hostname);
    } catch { /* 非 URL 示例 */ }
  }
  return [...domains].sort(compareText);
}

function sourceClueLines(content) {
  return content.split("\n").flatMap((line, index) =>
    /(?:源材料|资料来源|参考材料包括|参考来源|改编自|翻译自)\s*[:：]?/.test(line) ? [index + 1] : []);
}

const packs = [];
const files = [];
for (const manifestPath of await findManifests(rulepacksRoot)) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const directory = path.dirname(manifestPath);
  const id = portable(path.relative(rulepacksRoot, directory));
  assert.equal(manifest.id, id, `规则包 ID 不匹配：${manifestPath}`);
  assert.ok(Array.isArray(manifest.rules), `规则包缺少规则列表：${id}`);
  packs.push({ id, count: manifest.rules.length });
  for (const rule of manifest.rules) {
    assert.ok(typeof rule === "string" && rule.endsWith(".md") && !/[\\:\0]/.test(rule) && !path.isAbsolute(rule) &&
      rule.split("/").every((segment) => segment && segment !== "." && segment !== ".."), `不安全的规则路径：${id}/${String(rule)}`);
    const relativePath = portable(path.join("rulepacks", id, rule));
    const content = (await readFile(path.join(directory, rule), "utf8")).replace(/\r\n/g, "\n");
    files.push({
      path: relativePath,
      digest: createHash("sha256").update(content).digest("hex"),
      clues: sourceClueLines(content),
      domains: externalDomains(content),
    });
  }
}
packs.sort((left, right) => compareText(left.id, right.id));
files.sort((left, right) => compareText(left.path, right.path));
assert.equal(new Set(files.map((file) => file.path)).size, files.length, "规则文件在清单中重复");

const sourceClueCount = files.filter((file) => file.clues.length).length;
const linkedCount = files.filter((file) => file.domains.length).length;
const lines = [
  "# 规则包内容来源逐文件清单",
  "",
  "本清单由 `node scripts/generate-provenance-inventory.mjs --write` 从当前 `rulepacks/` 清单和文件内容生成；CI 用 `--check` 检查同步。SHA-256 按 CRLF 转 LF 后的文本计算，以便跨平台复核。它只提供人工复核线索，不判断原创性、许可或公开权限。文件内容变化会改变摘要；已完成的人工授权记录必须针对变更重新核对。`archive/legacy-rules/` 需单独审查。",
  "",
  `当前纳入 ${packs.length} 个规则包、${files.length} 份 Markdown；${sourceClueCount} 份包含明确的来源措辞线索，${linkedCount} 份含外部 URL。没有线索或外链不代表内容由本仓库原创；有外链也不代表正文来自该网站。`,
  "",
  "## 规则包汇总",
  "",
  "| 规则包 | 收录文件数 |",
  "|---|---:|",
  ...packs.map((pack) => `| \`${pack.id}\` | ${pack.count} |`),
  "",
  "## 逐文件复核索引",
  "",
  "来源线索列只标记匹配行号，须打开正文核对上下文；外链域名仅说明文本出现过 URL。人工审查结论记录在 [内容权利复核表](content-rights-review.md)，不能直接在自动生成清单中勾选。",
  "",
  "| 文件 | 规范化文本 SHA-256 | 来源线索行 | 外链域名 |",
  "|---|---|---|---|",
  ...files.map((file) => `| [\`${file.path}\`](<../${file.path}>) | \`${file.digest}\` | ${file.clues.length ? file.clues.map((line) => `L${line}`).join(", ") : "—"} | ${file.domains.length ? file.domains.join(", ") : "—"} |`),
  "",
];
const output = lines.join("\n");
if (mode === "--write") await writeFile(outputPath, output, "utf8");
else if (mode === "--check") assert.equal((await readFile(outputPath, "utf8")).replace(/\r\n/g, "\n"), output, "规则包来源清单已过期；运行 node scripts/generate-provenance-inventory.mjs --write 后审查差异");
else process.stdout.write(output);
if (mode) console.log(`规则包内容来源清单${mode === "--write" ? "已生成" : "已同步"}：${packs.length} 个规则包，${files.length} 份文档`);
