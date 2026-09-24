import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [tag, sourceCommit, destination = "agentrulekit-release.json"] = process.argv.slice(2);
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) throw new Error(`非法版本标签：${tag}`);
if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(sourceCommit ?? "")) throw new Error("来源提交必须是完整 Git SHA");

const version = tag.slice(1);
const rootVersion = JSON.parse(await readFile("package.json", "utf8")).version;
if (rootVersion !== version) throw new Error(`仓库版本 ${rootVersion} 与 ${tag} 不一致`);

await writeFile(path.resolve(destination), `${JSON.stringify({ schemaVersion: 1, version, sourceCommit }, null, 2)}\n`, "utf8");
console.log(`已生成 ${tag} 的规则源提交记录：${sourceCommit}`);
