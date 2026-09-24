import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const outputPath = path.join(repository, "docs", "legacy-archive-inventory.md");
const mode = process.argv[2];
if (mode && !["--write", "--check"].includes(mode)) throw new Error(`未知参数：${mode}`);

const trackedMarkdown = (...directories) => execFileSync("git", ["ls-files", "-z", "--", ...directories], {
  cwd: repository, encoding: "utf8",
}).split("\0").filter((relativePath) => relativePath.endsWith(".md"))
  .map((relativePath) => path.join(repository, relativePath));

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const portable = (absolutePath) => path.relative(repository, absolutePath).split(path.sep).join("/");
const digest = async (absolutePath) => createHash("sha256")
  .update((await readFile(absolutePath, "utf8")).replace(/\r\n/g, "\n"))
  .digest("hex");

const currentByHash = new Map();
for (const directory of ["rulepacks", "adapters"]) {
  for (const absolutePath of trackedMarkdown(directory)) {
    const hash = await digest(absolutePath);
    const matches = currentByHash.get(hash) ?? [];
    matches.push(portable(absolutePath));
    currentByHash.set(hash, matches);
  }
}

const files = [];
for (const absolutePath of trackedMarkdown("archive/legacy-rules")) {
  const relativePath = portable(absolutePath);
  const hash = await digest(absolutePath);
  const matches = (currentByHash.get(hash) ?? []).sort(compareText);
  const group = relativePath.split("/")[2] ?? "归档根目录";
  files.push({ relativePath, hash, matches, group });
}
files.sort((left, right) => compareText(left.relativePath, right.relativePath));

const sameRulepack = files.filter((file) => file.matches.some((match) => match.startsWith("rulepacks/"))).length;
const sameAdapter = files.filter((file) => file.matches.some((match) => match.startsWith("adapters/"))).length;
const noExactMatch = files.filter((file) => file.matches.length === 0).length;
const groups = [...new Set(files.map((file) => file.group))].sort(compareText);
const link = (relativePath) => "[`" + relativePath + "`](<../" + relativePath + ">)";
const lines = [
  "# 历史归档逐文件对照清单",
  "",
  "本清单由 `node scripts/generate-legacy-archive-inventory.mjs --write` 生成，CI 用 `--check` 检查同步。仅比较 Git 跟踪的当前工作树中 `archive/legacy-rules/` 与 `rulepacks/`、`adapters/` 的 Markdown 文件；SHA-256 按 CRLF 转 LF 后的文本计算。完全相同只说明内容相同，不证明作者、授权或归档可以删除；未找到完全相同的当前文件也不证明内容独有。**本清单不覆盖 Git 历史中已删除或修改的旧内容。**",
  "",
  `当前归档 ${files.length} 份 Markdown；${sameRulepack} 份与当前规则正文完全相同，${sameAdapter} 份与当前适配器 Markdown 完全相同，${noExactMatch} 份在这两个目录未找到完全相同的内容。两类匹配数可能重叠。以上均待人工审查公开权限。`,
  "",
  "## 分组汇总",
  "",
  "| 归档分组 | 文件数 | 与当前规则正文相同 | 与当前适配器相同 | 无完全相同内容 |",
  "|---|---:|---:|---:|---:|",
  ...groups.map((group) => {
    const members = files.filter((file) => file.group === group);
    return `| ${group} | ${members.length} | ${members.filter((file) => file.matches.some((match) => match.startsWith("rulepacks/"))).length} | ${members.filter((file) => file.matches.some((match) => match.startsWith("adapters/"))).length} | ${members.filter((file) => file.matches.length === 0).length} |`;
  }),
  "",
  "## 逐文件对照",
  "",
  "人工复核时请打开归档文件及匹配文件，检查来源、代码示例、引用材料、许可和历史版本；不要只依赖哈希。公开范围决策记录在[内容权利复核表](content-rights-review.md)。",
  "",
  "| 归档文件 | 规范化文本 SHA-256 | 当前完全相同文件 |",
  "|---|---|---|",
  ...files.map((file) => `| ${link(file.relativePath)} | ` + "`" + file.hash + "`" + ` | ${file.matches.length ? file.matches.map(link).join("、") : "—"} |`),
  "",
];
const output = lines.join("\n");
if (mode === "--write") {
  await writeFile(outputPath, output, "utf8");
} else if (mode === "--check") {
  if ((await readFile(outputPath, "utf8")).replace(/\r\n/g, "\n") !== output) {
    throw new Error("历史归档对照清单已过期；运行 node scripts/generate-legacy-archive-inventory.mjs --write 后审查差异");
  }
} else {
  process.stdout.write(output);
}
if (mode) console.log(`历史归档对照清单${mode === "--write" ? "已生成" : "已同步"}：${files.length} 份文档`);
