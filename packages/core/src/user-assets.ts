import { createHash, randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertAssetManifest, type AssetManifest, type InstalledAsset } from "./assets.js";

export const assetDigest = (data: Uint8Array | string): string => `sha256:${createHash("sha256").update(data).digest("hex")}`;
export type AssetFiles = Map<string, Buffer>;
export function assetBytes(data: Buffer, mode: number): Buffer {
  Object.defineProperty(data, "assetFileMode", { value: mode & 0o777, enumerable: false }); return data;
}
const fileMode = (data: Buffer): number => (data as Buffer & { assetFileMode?: number }).assetFileMode ?? 0o644;
export interface UserAssetReceipt extends InstalledAsset {
  destination: string;
  sourceKey: string;
  sourceDigest: string;
  title: string;
  managedModes?: Record<string, number>;
  host?: { pluginId: string; cachePath: string; activePath?: string; files: Record<string, string> };
}
export interface UserAssetDelivery {
  manifest: AssetManifest;
  destination: string;
  sourceKey: string;
  sourceDigest: string;
  files: AssetFiles;
}
export interface UserAssetPreview {
  token: string;
  action: "install" | "update" | "uninstall";
  ideId: string;
  title: string;
  version: string;
  destination: string;
  changes: { path: string; action: "add" | "modify" | "remove"; before?: string; after?: string }[];
  retainedPaths: string[];
  conflicts: string[];
}
type Pending = { preview: UserAssetPreview; delivery: UserAssetDelivery; previous?: UserAssetReceipt; before: AssetFiles; receiptText?: string };
export type AssetEffect = (next: UserAssetReceipt | undefined, previous: UserAssetReceipt | undefined) => Promise<UserAssetReceipt["host"] | void>;

function validPath(value: string): boolean {
  return !!value && !/[\\\0:]/.test(value) && !path.posix.isAbsolute(value) && value.split("/").every((part) => part && part !== "." && part !== "..");
}
async function present(file: string): Promise<boolean> {
  try { await lstat(file); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}
/** Every existing ancestor must be a real directory. Never follow a user-controlled symlink. */
export async function assertAssetDirectory(directory: string): Promise<void> {
  if (!path.isAbsolute(directory)) throw new Error("安装目录必须是绝对路径");
  let current = path.parse(directory).root;
  for (const segment of directory.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!await present(current)) continue;
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("安装目录包含链接或非目录路径");
  }
}
export async function readAssetFiles(directory: string): Promise<AssetFiles> {
  await assertAssetDirectory(directory);
  const files: AssetFiles = new Map();
  if (!await present(directory)) return files;
  let bytes = 0;
  async function visit(relative: string): Promise<void> {
    for (const item of await readdir(path.join(directory, relative), { withFileTypes: true })) {
      const file = relative ? `${relative}/${item.name}` : item.name;
      if (!validPath(file)) throw new Error("安装文件路径不合法");
      const absolute = path.join(directory, file); const info = await lstat(absolute);
      if (info.isSymbolicLink()) throw new Error("安装文件中存在符号链接");
      if (info.isDirectory()) await visit(file);
      else {
        if (!info.isFile() || files.size >= 5000 || bytes + info.size > 50 * 1024 * 1024) throw new Error("安装目录含特殊文件或超过体积上限");
        const content = await readFile(absolute); bytes += content.length; files.set(file, assetBytes(content, info.mode));
      }
    }
  }
  await visit(""); return files;
}
export function assetFileHashes(files: AssetFiles): Record<string, string> {
  return Object.fromEntries([...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, bytes]) => [file, assetDigest(bytes)]));
}
const fingerprint = (files: AssetFiles): string => JSON.stringify([...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, data]) => [file, assetDigest(data), fileMode(data)]));
function display(bytes: Buffer | undefined): string | undefined {
  if (bytes === undefined) return undefined;
  try { const text = new TextDecoder("utf8", { fatal: true }).decode(bytes); if (!text.includes("\0")) return text; } catch { /* Binary preview. */ }
  return `[二进制 ${bytes.length} 字节，${assetDigest(bytes)}]`;
}
async function atomicText(file: string, text: string): Promise<void> {
  await assertAssetDirectory(path.dirname(file));
  await mkdir(path.dirname(file), { recursive: true });
  if (await present(file) && (!(await lstat(file)).isFile() || (await lstat(file)).isSymbolicLink())) throw new Error("安装记录不是普通文件");
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, text, { flag: "wx", mode: 0o600 }); await rename(temporary, file); }
  finally { await rm(temporary, { force: true }); }
}

/** Filesystem lifecycle shared by IDE adapters. It never reads or writes a project. */
export class UserAssetStore {
  private pending = new Map<string, Pending>();
  constructor(private readonly stateRoot: string, private readonly roots: Record<string, string[]>) {}
  private destination(ideId: string, destination: string): void {
    if (!this.roots[ideId]?.some((root) => path.isAbsolute(destination) && path.resolve(destination) === destination && destination.startsWith(`${path.resolve(root)}${path.sep}`))) throw new Error("安装目录不属于所选软件的用户环境");
  }
  private record(ideId: string, id: string): string {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(ideId) || !/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error("安装标识无效");
    return path.join(this.stateRoot, `${ideId}--${id}.json`);
  }
  private async receipt(ideId: string, id: string): Promise<{ value?: UserAssetReceipt; text?: string }> {
    const file = this.record(ideId, id);
    await assertAssetDirectory(this.stateRoot);
    if (!await present(file)) return {};
    if (!(await lstat(file)).isFile() || (await lstat(file)).isSymbolicLink()) throw new Error("安装记录不是普通文件");
    const text = await readFile(file, "utf8"); const value = JSON.parse(text) as UserAssetReceipt;
    if (!value || value.id !== id || value.target?.ideId !== ideId || value.target.scope !== "ide-user" ||
      !["skill", "capability-plugin"].includes(value.kind) || typeof value.version !== "string" || typeof value.title !== "string" ||
      typeof value.sourceKey !== "string" || typeof value.sourceDigest !== "string" ||
      !value.managedFiles || Array.isArray(value.managedFiles) || typeof value.managedFiles !== "object" ||
      Object.entries(value.managedFiles).some(([key, hash]) => !validPath(key) || !/^sha256:[a-f0-9]{64}$/.test(hash)) ||
      (value.managedModes !== undefined && (!value.managedModes || typeof value.managedModes !== "object" || Object.entries(value.managedModes).some(([file, mode]) => !Object.hasOwn(value.managedFiles, file) || !Number.isInteger(mode) || mode < 0 || mode > 0o777))) ||
      typeof value.destination !== "string") throw new Error("安装记录已损坏，拒绝写入");
    this.destination(ideId, value.destination); return { value, text };
  }
  async list(): Promise<UserAssetReceipt[]> {
    await assertAssetDirectory(this.stateRoot);
    if (!await present(this.stateRoot)) return [];
    const records: UserAssetReceipt[] = [];
    for (const entry of await readdir(this.stateRoot)) {
      const match = /^([a-z0-9-]+)--([a-z0-9-]+)\.json$/.exec(entry);
      if (match) records.push((await this.receipt(match[1]!, match[2]!)).value!);
    }
    return records;
  }
  async validate(receipt: UserAssetReceipt): Promise<string[]> {
    this.destination(receipt.target.ideId, receipt.destination);
    const files = await readAssetFiles(receipt.destination);
    return Object.entries(receipt.managedFiles).filter(([file, hash]) => !files.has(file) || assetDigest(files.get(file)!) !== hash ||
      (process.platform !== "win32" && receipt.managedModes?.[file] !== undefined && fileMode(files.get(file)!) !== receipt.managedModes[file])).map(([file]) => `受管文件缺失或被修改：${file}`);
  }
  async preview(action: UserAssetPreview["action"], ideId: string, delivery: UserAssetDelivery): Promise<UserAssetPreview> {
    assertAssetManifest(delivery.manifest);
    if (!delivery.manifest.supportedIdes.includes(ideId)) throw new Error("内容不支持所选软件");
    this.destination(ideId, delivery.destination);
    if ([...delivery.files.keys()].some((file) => !validPath(file))) throw new Error("交付文件路径不合法");
    const record = await this.receipt(ideId, delivery.manifest.id);
    if (action === "install" && record.value) throw new Error("已安装，请使用更新");
    if (action !== "install" && !record.value) throw new Error("工具箱没有此内容的安装记录");
    if (record.value && (record.value.destination !== delivery.destination || record.value.kind !== delivery.manifest.kind)) throw new Error("安装目标或类型发生变化");
    const before = await readAssetFiles(delivery.destination);
    const conflicts = record.value ? await this.validate(record.value) : await present(delivery.destination) ? ["目标目录已有未知内容，拒绝覆盖"] : [];
    const retainedPaths = record.value ? [...before.keys()].filter((file) => !Object.hasOwn(record.value!.managedFiles, file)) : [];
    for (const file of retainedPaths) {
      if (action !== "uninstall" && [...delivery.files.keys()].some((next) => next === file || next.startsWith(`${file}/`) || file.startsWith(`${next}/`))) conflicts.push(`新增文件与未知内容冲突：${file}`);
    }
    const desired = action === "uninstall" ? new Map<string, Buffer>() : delivery.files;
    const changes: UserAssetPreview["changes"] = [];
    const managedBefore = new Set(Object.keys(record.value?.managedFiles ?? {}));
    for (const file of new Set([...managedBefore, ...desired.keys()])) {
      const old = before.get(file), next = desired.get(file);
      if (old?.equals(next ?? Buffer.alloc(0)) && next !== undefined && (process.platform === "win32" || fileMode(old) === fileMode(next))) continue;
      if (!old && !next) continue;
      changes.push({ path: file, action: next === undefined ? "remove" : old === undefined ? "add" : "modify", before: display(old), after: display(next) });
    }
    const preview = { token: randomUUID(), action, ideId, title: delivery.manifest.title, version: delivery.manifest.version,
      destination: delivery.destination, changes, retainedPaths, conflicts };
    this.pending.clear();
    this.pending.set(preview.token, { preview, delivery, previous: record.value, receiptText: record.text, before });
    return preview;
  }
  async apply(token: string, effect?: AssetEffect, rollbackEffect?: (previous?: UserAssetReceipt) => Promise<void>): Promise<UserAssetReceipt | undefined> {
    const pending = this.pending.get(token);
    if (!pending) throw new Error("预览已失效，请重新预览");
    if (pending.preview.conflicts.length) throw new Error("存在冲突，不能应用");
    await assertAssetDirectory(this.stateRoot); await mkdir(this.stateRoot, { recursive: true });
    const lock = path.join(this.stateRoot, ".operation-lock");
    try { await mkdir(lock); } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("另一个资产操作或中断操作尚未结束"); throw error; }
    const { delivery, previous, before, preview } = pending;
    const record = this.record(preview.ideId, delivery.manifest.id);
    const staging = `${delivery.destination}.toolbox-${randomUUID()}`;
    const backup = `${staging}.backup`;
    let swapped = false, hadDestination = false, movedOld = false, effectStarted = false, committed = false;
    try {
      const current = await this.receipt(preview.ideId, delivery.manifest.id);
      if (current.text !== pending.receiptText || fingerprint(await readAssetFiles(delivery.destination)) !== fingerprint(before)) throw new Error("安装内容在预览后发生变化，请重新预览");
      const nextFiles = new Map(preview.retainedPaths.map((file) => [file, before.get(file)!]));
      if (preview.action !== "uninstall") for (const [file, data] of delivery.files) nextFiles.set(file, data);
      await assertAssetDirectory(path.dirname(delivery.destination));
      await mkdir(staging, { recursive: true });
      for (const [file, data] of nextFiles) {
        const target = path.join(staging, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, data, { flag: "wx", mode: fileMode(data) });
        if (process.platform !== "win32") await chmod(target, fileMode(data));
      }
      // Native plugin removal still needs the old marketplace and source files.
      if (effect && preview.action === "uninstall") { effectStarted = true; await effect(undefined, previous); }
      hadDestination = await present(delivery.destination);
      if (hadDestination) { await rename(delivery.destination, backup); movedOld = true; }
      await rename(staging, delivery.destination); swapped = true;
      let next: UserAssetReceipt | undefined = preview.action === "uninstall" ? undefined : {
        id: delivery.manifest.id, kind: delivery.manifest.kind, title: delivery.manifest.title, version: delivery.manifest.version,
        target: { ideId: preview.ideId, scope: "ide-user" }, installedAt: new Date().toISOString(),
        destination: delivery.destination, sourceKey: delivery.sourceKey, sourceDigest: delivery.sourceDigest,
        managedFiles: assetFileHashes(delivery.files),
        managedModes: process.platform === "win32" ? undefined : Object.fromEntries([...delivery.files].map(([file, data]) => [file, fileMode(data)])),
      };
      if (effect && preview.action !== "uninstall") { effectStarted = true; const host = await effect(next, previous); if (next && host) next.host = host; }
      if (next) await atomicText(record, `${JSON.stringify(next, null, 2)}\n`); else await rm(record);
      committed = true;
      await rm(backup, { recursive: true, force: true });
      if (!nextFiles.size) await rm(delivery.destination, { recursive: true });
      this.pending.delete(token); return next;
    } catch (error) {
      if (!committed && (swapped || movedOld)) {
        if (swapped) await rm(delivery.destination, { recursive: true, force: true });
        if (movedOld) await rename(backup, delivery.destination);
        if (pending.receiptText) await atomicText(record, pending.receiptText); else await rm(record, { force: true });
      }
      if (!committed && effectStarted && rollbackEffect) await rollbackEffect(previous);
      throw error;
    } finally { await rm(staging, { recursive: true, force: true }); await rm(lock, { recursive: true, force: true }); }
  }
}
