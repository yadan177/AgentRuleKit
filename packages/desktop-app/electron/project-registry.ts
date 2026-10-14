import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface RegisteredProject {
  root: string;
  addedAt: string;
}

interface RegistryFile {
  schemaVersion: 1;
  projects: RegisteredProject[];
}

/** Personal toolbox state. Project rule files remain the authority for each project's rules. */
export class ProjectRegistry {
  private pendingWrite: Promise<void> = Promise.resolve();
  constructor(private readonly file: string) {}

  private serialize<T>(action: () => Promise<T>): Promise<T> {
    const result = this.pendingWrite.then(action);
    this.pendingWrite = result.then(() => {}, () => {});
    return result;
  }

  private async read(): Promise<RegistryFile> {
    let content: string;
    try { content = await readFile(this.file, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { schemaVersion: 1, projects: [] };
      throw error;
    }
    let value: unknown;
    try { value = JSON.parse(content); }
    catch { throw new Error("工具箱项目列表已损坏；请备份并检查数据文件，未覆盖原内容"); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("工具箱项目列表格式不正确，未覆盖原内容");
    const data = value as Partial<RegistryFile>;
    if (Object.keys(data).some((key) => !["schemaVersion", "projects"].includes(key)) ||
      data.schemaVersion !== 1 || !Array.isArray(data.projects) ||
      data.projects.some((item) => !item || typeof item.root !== "string" || !path.isAbsolute(item.root) ||
        typeof item.addedAt !== "string" || Number.isNaN(Date.parse(item.addedAt)) ||
        Object.keys(item).some((key) => !["root", "addedAt"].includes(key))) ||
      new Set(data.projects.map((item) => item.root)).size !== data.projects.length) {
      throw new Error("工具箱项目列表版本或内容不受支持，未覆盖原内容");
    }
    return { schemaVersion: 1, projects: data.projects };
  }

  private async write(data: RegistryFile): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(temporary, this.file);
    } finally { await rm(temporary, { force: true }); }
  }

  async list(): Promise<RegisteredProject[]> { await this.pendingWrite; return (await this.read()).projects; }

  async add(root: string): Promise<RegisteredProject[]> {
    return this.serialize(async () => {
    if (!path.isAbsolute(root)) throw new Error("请选择项目文件夹");
    const info = await lstat(root);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("项目路径必须是普通文件夹");
    const resolved = await realpath(root);
    const data = await this.read();
    if (!data.projects.some((item) => item.root === resolved)) {
      data.projects.push({ root: resolved, addedAt: new Date().toISOString() });
      await this.write(data);
    }
    return data.projects;
    });
  }

  async remove(root: string): Promise<RegisteredProject[]> {
    return this.serialize(async () => {
    const data = await this.read();
    const next = data.projects.filter((item) => item.root !== root);
    if (next.length === data.projects.length) throw new Error("项目不在工具箱列表中");
    data.projects = next;
    await this.write(data);
    return next;
    });
  }

  async contains(root: string): Promise<boolean> {
    return (await this.read()).projects.some((item) => item.root === root);
  }
}
