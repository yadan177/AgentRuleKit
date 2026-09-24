import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rulepacksRoot = path.join(repositoryRoot, "rulepacks");
const toolkitVersion = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8")).version;

const packs = [
  { id: "common", kind: "common", entry: "entry.md", dependencies: [] },
  { id: "python", kind: "development", entry: "14-AI通用入口规则.md", dependencies: ["common"] },
  { id: "go", kind: "development", entry: "13-AI通用入口规则.md", dependencies: ["common"] },
  { id: "java", kind: "development", entry: "14-AI通用入口规则.md", dependencies: ["common"] },
  { id: "javascript", kind: "development", entry: "15-AI通用入口规则.md", dependencies: ["common"] },
  { id: "typescript", kind: "development", entry: "09-AI通用入口规则.md", dependencies: ["common", "javascript"] },
  { id: "unity", kind: "development", entry: "15-AI通用入口规则.md", dependencies: ["common"] },
  { id: "pico", kind: "development", entry: "PICO Unity SDK.md", dependencies: ["common", "unity"] },
  { id: "rule-authoring", kind: "common", entry: "规则文档编写格式规范.md", dependencies: ["common"] },
  { id: "project-docs/python", kind: "documentation", entry: "其他规则/04-PythonAI技术文档任务入口.md", dependencies: ["common"] },
  { id: "project-docs/go", kind: "documentation", entry: "其他规则/04-GoAI技术文档任务入口.md", dependencies: ["common"] },
  { id: "project-docs/java", kind: "documentation", entry: "其他规则/04-JavaAI技术文档任务入口.md", dependencies: ["common"] },
  { id: "project-docs/js-ts", kind: "documentation", entry: "其他规则/04-JS+TSAI技术文档任务入口.md", dependencies: ["common"] },
  { id: "project-docs/unity", kind: "documentation", entry: "其他规则/04-UnityAI技术文档任务入口.md", dependencies: ["common"] },
];

async function listMarkdown(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdown(absolutePath, relativePath)));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      files.push(relativePath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right, "zh-CN"));
}

for (const pack of packs) {
  const directory = path.join(rulepacksRoot, ...pack.id.split("/"));
  const entryPath = path.join(directory, ...pack.entry.split("/"));
  if (!(await stat(entryPath)).isFile()) {
    throw new Error(`规则包 ${pack.id} 缺少入口：${pack.entry}`);
  }

  const depth = pack.id.split("/").length;
  const schemaPath = `${"../".repeat(depth + 1)}schemas/rulepack.schema.json`;
  const manifest = {
    $schema: schemaPath,
    id: pack.id,
    version: toolkitVersion,
    status: "ready",
    kind: pack.kind,
    entry: pack.entry,
    dependencies: pack.dependencies,
    rules: await listMarkdown(directory),
  };
  await writeFile(path.join(directory, "pack.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log(`已生成 ${packs.length} 个规则包 manifest。`);
