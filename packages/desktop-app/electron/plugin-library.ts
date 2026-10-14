import { createHash, randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, readdir, rename, rm, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { parse } from "yaml";
import { productDesignDeliveryFiles } from "../../../adapters/traework/product-design.ts";
import { assetBytes } from "../../core/src/user-assets.ts";

type SourceFile = { path: string; sha256: string; bytes: number };
export type PluginImport = {
  kind: "skill" | "capability-plugin";
  schemaVersion: 1; key: string; name: string; version: string; title: string; author: string; license: string;
  sourceRoot: string; importedAt: string; skills: string[]; files: SourceFile[];
  sourceDigest: string; runtimeDependencies: string[]; delivery: "traework-skill" | "unsupported";
};
export type PluginInspection = Omit<PluginImport, "importedAt" | "schemaVersion">;
const MAX_FILES = 5000;
const MAX_BYTES = 50 * 1024 * 1024;
const digest = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function safePath(value: string): boolean {
  return !!value && !value.includes("\\") && !value.includes("\0") && !value.split("/").some((part) => !part || part === "." || part === "..");
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown, fallback: string): string { return typeof value === "string" && value.trim() ? value : fallback; }

// Import is data-only: never execute source scripts or follow source symlinks.
async function collect(root: string): Promise<Map<string, Buffer>> {
  if (!(await lstat(root)).isDirectory() || (await lstat(root)).isSymbolicLink()) throw new Error("源路径必须是普通目录");
  const files = new Map<string, Buffer>();
  let bytes = 0;
  async function visit(relative: string): Promise<void> {
    const entries = await readdir(path.join(root, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const file = relative ? `${relative}/${entry.name}` : entry.name;
      if (!safePath(file)) throw new Error("源文件路径无效");
      const absolute = path.join(root, file);
      const stat = await lstat(absolute);
      if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) throw new Error(`不支持链接或特殊文件：${file}`);
      if (stat.isDirectory()) {
        if ([".git", "node_modules"].includes(entry.name)) throw new Error(`请选择插件包目录，不要导入工作仓库或依赖目录：${file}`);
        await visit(file);
      } else {
        if (files.size >= MAX_FILES || bytes + stat.size > MAX_BYTES) throw new Error("插件超过导入上限（5000 文件 / 50 MiB）");
        const data = await readFile(absolute);
        bytes += data.byteLength;
        if (bytes > MAX_BYTES) throw new Error("插件超过导入大小上限");
        files.set(file, assetBytes(data, stat.mode));
      }
    }
  }
  await visit("");
  return files;
}
function sourceFiles(files: Map<string, Buffer>): SourceFile[] {
  return [...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, data]) => ({ path: file, sha256: digest(data), bytes: data.byteLength }));
}
function inspectFiles(root: string, files: Map<string, Buffer>): PluginInspection {
  const raw = files.get("plugin.json") ?? files.get(".codex-plugin/plugin.json");
  if (!raw && files.has("SKILL.md")) {
    const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(files.get("SKILL.md")!.toString("utf8"));
    const metadata: unknown = header ? parse(header[1]) : undefined;
    if (!object(metadata) || typeof metadata.name !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(metadata.name) || typeof metadata.description !== "string" || !metadata.description.trim()) throw new Error("Skill 缺少有效名称或描述");
    const records = sourceFiles(files);
    const fallbackVersion = `0.0.0-${digest(JSON.stringify(records)).slice(0, 12)}`;
    const version = object(metadata.metadata) ? text(metadata.metadata.version, fallbackVersion) : fallbackVersion;
    if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error("Skill 版本无效");
    return { kind: "skill", key: `skill.${metadata.name}@${version}`, name: metadata.name, version,
      title: metadata.name, author: "未声明", license: text(metadata.license, "未声明"), sourceRoot: root,
      skills: [metadata.name], files: records, sourceDigest: digest(JSON.stringify(records)), runtimeDependencies: [], delivery: "unsupported" };
  }
  if (!raw) throw new Error("缺少插件清单或根级 SKILL.md；请选择插件或 Skill 包根目录");
  const manifest: unknown = JSON.parse(raw.toString("utf8"));
  if (!object(manifest)) throw new Error("插件清单无效");
  const name = text(manifest.name, ""); const version = text(manifest.version, "");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name) || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error("插件名称或版本无效");
  const overlay = files.get(".codex-plugin/plugin.json");
  const legacy = overlay ? JSON.parse(overlay.toString("utf8")) : manifest;
  const skillsRoot = text(legacy.skills, "skills").replace(/^\.\//, "").replace(/\/$/, "");
  if (!safePath(skillsRoot)) throw new Error("Skill 目录声明无效");
  const skills = [...files.keys()].filter((file) => file.startsWith(`${skillsRoot}/`) && file.endsWith("/SKILL.md"));
  for (const file of skills) {
    const body = files.get(file)!.toString("utf8");
    const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(body);
    const metadata: unknown = header ? parse(header[1]) : undefined;
    if (!object(metadata) || typeof metadata.name !== "string" || !metadata.name.trim() || typeof metadata.description !== "string" || !metadata.description.trim()) throw new Error(`Skill 缺少名称或描述：${file}`);
  }
  const runtimeDependencies = ["mcpServers", "mcp", "hooks", "apps"].filter((field) => manifest[field] != null || legacy[field] != null);
  for (const file of [".mcp.json", "mcp.json", "hooks/hooks.json", ".app.json"]) if (files.has(file)) runtimeDependencies.push(file);
  if (object(manifest.extensions) && object(manifest.extensions["com.openai"])) {
    for (const field of ["apps", "hooks", "mcpServers"]) if (manifest.extensions["com.openai"][field] != null) runtimeDependencies.push(field);
  }
  let delivery: PluginInspection["delivery"] = "unsupported";
  if (!runtimeDependencies.length) {
    try { productDesignDeliveryFiles(name, version, new Set(files.keys())); delivery = "traework-skill"; } catch { /* Other sources are retained but not declared compatible. */ }
  }
  const records = sourceFiles(files);
  return {
    kind: "capability-plugin", key: `${name}@${version}`, name, version, title: object(manifest.interface) ? text(manifest.interface.displayName, name) : name,
    author: object(manifest.author) ? text(manifest.author.name, "未知") : text(manifest.author, "未知"),
    license: text(manifest.license, "未声明"), sourceRoot: root, skills: skills.map((file) => file.slice(skillsRoot.length + 1, -"/SKILL.md".length)),
    files: records, sourceDigest: digest(JSON.stringify(records)), runtimeDependencies, delivery,
  };
}

export class PluginLibrary {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private readonly directory: string) {}
  private serial<T>(action: () => Promise<T>): Promise<T> {
    const job = this.pending.then(action, action);
    this.pending = job.catch(() => {}); return job;
  }
  private folder(key: string): string {
    if (!/^(?:skill\.)?[a-z0-9][a-z0-9-]{0,63}@\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(key)) throw new Error("导入标识无效");
    return path.join(this.directory, key);
  }
  async inspect(source: string): Promise<PluginInspection> {
    if (typeof source !== "string" || !path.isAbsolute(source)) throw new Error("源路径无效");
    if ((await lstat(source)).isSymbolicLink()) throw new Error("请选择原始目录，不支持链接目录");
    const root = await realpath(source);
    return inspectFiles(root, await collect(root));
  }
  async list(): Promise<PluginImport[]> {
    let entries;
    try { entries = await readdir(this.directory, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
    const imports: PluginImport[] = [];
    for (const entry of entries) {
      if (entry.name.startsWith(".import-")) continue;
      if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("导入库包含未知文件或链接");
      imports.push(await this.load(entry.name));
    }
    return imports.sort((a, b) => a.title.localeCompare(b.title));
  }
  private async load(key: string): Promise<PluginImport> {
    const folder = this.folder(key);
    if ((await lstat(folder)).isSymbolicLink()) throw new Error("导入库路径不得是链接");
    const receiptFile = path.join(folder, "import.json");
    if (!(await lstat(receiptFile)).isFile() || (await lstat(receiptFile)).isSymbolicLink()) throw new Error("导入记录文件无效");
    const receipt: unknown = JSON.parse(await readFile(receiptFile, "utf8"));
    if (!object(receipt) || receipt.schemaVersion !== 1 || receipt.key !== key || typeof receipt.sourceRoot !== "string" || typeof receipt.importedAt !== "string") throw new Error("导入记录无效");
    const source = inspectFiles(receipt.sourceRoot, await collect(path.join(folder, "source")));
    for (const field of Object.keys(source) as (keyof PluginInspection)[]) {
      const previous = field === "kind" ? receipt[field] ?? "capability-plugin" : receipt[field];
      if (JSON.stringify(source[field]) !== JSON.stringify(previous)) throw new Error("导入快照或来源记录发生变化，请重新检查来源");
    }
    return { schemaVersion: 1, ...source, importedAt: receipt.importedAt };
  }
  async snapshot(key: string): Promise<{ receipt: PluginImport; files: Map<string, Buffer> }> {
    const receipt = await this.load(key);
    const files = await collect(path.join(this.folder(key), "source"));
    if (digest(JSON.stringify(sourceFiles(files))) !== receipt.sourceDigest) throw new Error("导入快照发生变化");
    return { receipt, files };
  }
  import(source: string, expectedDigest: string): Promise<PluginImport> {
    return this.serial(async () => {
      const inspection = await this.inspect(source);
      if (inspection.sourceDigest !== expectedDigest) throw new Error("源插件在预览后发生变化，请重新预览");
      await mkdir(this.directory, { recursive: true });
      const target = this.folder(inspection.key);
      try { await lstat(target); throw new Error("此版本已导入，不覆盖已有快照"); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      const staging = path.join(this.directory, `.import-${randomUUID()}`);
      await mkdir(path.join(staging, "source"), { recursive: true });
      try {
        const content = await collect(inspection.sourceRoot);
        if (digest(JSON.stringify(sourceFiles(content))) !== expectedDigest) throw new Error("源插件在复制时发生变化");
        for (const [file, data] of content) {
          const output = path.join(staging, "source", file);
          await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, data, { flag: "wx", mode: (data as Buffer & { assetFileMode?: number }).assetFileMode ?? 0o644 });
          if (process.platform !== "win32") await chmod(output, (data as Buffer & { assetFileMode?: number }).assetFileMode ?? 0o644);
        }
        const receipt: PluginImport = { schemaVersion: 1, ...inspection, importedAt: new Date().toISOString() };
        await writeFile(path.join(staging, "import.json"), JSON.stringify(receipt, null, 2), { flag: "wx" });
        await rename(staging, target);
        return await this.load(inspection.key);
      } finally { await rm(staging, { recursive: true, force: true }); }
    });
  }
  async exportTraeWork(key: string, output: string): Promise<{ path: string; sha256: string; skillName: string; sourceDigest: string }> {
    if (typeof output !== "string" || !path.isAbsolute(output) || !output.endsWith(".zip")) throw new Error("请选择绝对路径的 .zip 文件");
    const receipt = await this.load(key);
    if (receipt.delivery !== "traework-skill") throw new Error("此插件尚无 TraeWork 适配；不能忽略工具连接或 Hook 后直接安装");
    const content = await collect(path.join(this.folder(key), "source"));
    if (digest(JSON.stringify(sourceFiles(content))) !== receipt.sourceDigest) throw new Error("导入快照在导出时发生变化");
    const archive: Record<string, Uint8Array> = Object.create(null);
    for (const [file, data] of content) archive[`source/${file}`] = data;
    for (const [file, data] of Object.entries(productDesignDeliveryFiles(receipt.name, receipt.version, new Set(content.keys())))) archive[file] = strToU8(data);
    archive["provenance.json"] = strToU8(JSON.stringify({ ...receipt, adapter: "traework-product-design-v1", deliveryKind: "skill", runtime: "local", verification: "exported-not-installed" }, null, 2));
    const zip = zipSync(archive, { level: 6 });
    await writeFile(output, zip, { flag: "wx" }); // Never silently overwrite user files.
    return { path: output, sha256: digest(zip), skillName: "toolbox-product-design", sourceDigest: receipt.sourceDigest };
  }
}
