import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const tag = process.argv[2];
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) throw new Error(`非法版本标签：${tag}`);
const version = tag.slice(1);

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

for (const file of ["package.json", "packages/cli/package.json", "plugins/agent-rule-kit/.codex-plugin/plugin.json"]) {
  const manifest = await json(file);
  if (manifest.version !== version) throw new Error(`${file} 版本 ${manifest.version} 与 ${tag} 不一致`);
}

const cliSource = await readFile("packages/cli/src/index.ts", "utf8");
if (!cliSource.includes(`const VERSION = "${version}";`)) throw new Error("CLI 内置版本与标签不一致");

async function inspectPacks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await inspectPacks(absolute);
    else if (entry.name === "pack.json") {
      const pack = await json(absolute);
      if (pack.version !== version) throw new Error(`${absolute} 版本 ${pack.version} 与 ${tag} 不一致`);
    }
  }
}

await inspectPacks("rulepacks");
console.log(`发布版本 ${tag}：CLI、插件与全部规则包一致`);
