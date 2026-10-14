import { execFile, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { assetFileHashes, readAssetFiles, type UserAssetReceipt } from "../../packages/core/src/user-assets.ts";

const execute = promisify(execFile);
export type CodexRunner = (args: string[]) => Promise<string>;
export async function findCodexCli(): Promise<string | undefined> {
  const directories = String(process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const executable = process.platform === "win32" ? "codex.exe" : "codex";
  const nativePackage = `codex-${process.platform}-${process.arch}`;
  const triple = process.platform === "win32" ? `${process.arch === "arm64" ? "aarch64" : "x86_64"}-pc-windows-msvc`
    : process.platform === "darwin" ? `${process.arch === "arm64" ? "aarch64" : "x86_64"}-apple-darwin`
    : `${process.arch === "arm64" ? "aarch64" : "x86_64"}-unknown-linux-musl`;
  const candidates = [
    "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex",
    "/Applications/Codex.app/Contents/Resources/codex",
    ...directories.map((directory) => path.join(directory, executable)),
    ...directories.flatMap((directory) => [path.join(directory, "node_modules"), path.join(directory, "../lib/node_modules")].flatMap((modules) => [
      path.join(modules, "@openai", nativePackage, "vendor", triple, "bin", executable),
      path.join(modules, "@openai/codex/node_modules/@openai", nativePackage, "vendor", triple, "bin", executable),
      path.join(modules, "@openai/codex/vendor", triple, "bin", executable),
    ])),
  ];
  for (const file of candidates) {
    try { await access(file); await execute(file, ["plugin", "add", "--help"], { timeout: 10000, maxBuffer: 64 * 1024 }); return file; }
    catch { /* Try the next installed binary; never install or repair Codex automatically. */ }
  }
}
export function codexRunner(binary: string, codexHome: string): CodexRunner {
  return async (args) => {
    const result = await execute(binary, args, { timeout: 60000, maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, CODEX_HOME: codexHome } });
    return result.stdout;
  };
}

/** Read-only discovery in the selected user environment. No thread or model request is started. */
export async function discoverCodexSkills(binary: string, userHome: string, codexHome: string): Promise<{ name: string; path: string; scope: string; enabled: boolean }[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ["app-server"], { cwd: userHome, env: { ...process.env, HOME: userHome, CODEX_HOME: codexHome }, stdio: ["pipe", "pipe", "ignore"] });
    const lines = createInterface({ input: child.stdout }); let finished = false; let received = 0;
    const finish = (error?: Error, result: { name: string; path: string; scope: string; enabled: boolean }[] = []) => {
      if (finished) return; finished = true; clearTimeout(timer); lines.close(); child.stdin.end(); child.kill();
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error("读取 Codex 技能列表超时")), 15000);
    child.on("error", () => finish(new Error("无法启动 Codex 技能检查")));
    child.stdin.on("error", () => finish(new Error("Codex 技能检查连接已关闭")));
    child.on("exit", () => { if (!finished) finish(new Error("Codex 技能检查提前结束")); });
    const send = (value: unknown) => child.stdin.write(`${JSON.stringify(value)}\n`);
    lines.on("line", (line) => {
      received += Buffer.byteLength(line);
      if (received > 8 * 1024 * 1024) return finish(new Error("Codex 技能列表超出检查上限"));
      let message; try { message = JSON.parse(line); } catch { return; }
      if (!message || typeof message !== "object") return;
      if (message.id === 1) {
        if (message.error) return finish(new Error("Codex 不支持技能检查协议"));
        send({ method: "initialized", params: {} });
        send({ id: 2, method: "skills/list", params: { cwds: [userHome], forceReload: true } });
      } else if (message.id === 2) {
        if (message.error) return finish(new Error("Codex 无法读取技能列表"));
        const result: { name: string; path: string; scope: string; enabled: boolean }[] = [];
        function collect(value: unknown): void {
          if (Array.isArray(value)) for (const item of value) collect(item);
          else if (value && typeof value === "object") {
            const item = value as Record<string, unknown>;
            if (typeof item.name === "string" && typeof item.path === "string" && typeof item.scope === "string") result.push({ name: item.name, path: item.path, scope: item.scope, enabled: item.enabled === true });
            else for (const child of Object.values(item)) collect(child);
          }
        }
        collect(message.result); finish(undefined, result);
      }
    });
    send({ id: 1, method: "initialize", params: { clientInfo: { name: "agentrulekit-installer", version: "0.1.5" }, capabilities: { experimentalApi: false } } });
  });
}

export class CodexPluginHost {
  constructor(private readonly run: CodexRunner, private readonly codexHome: string) {}
  private identity(name: string): { marketplace: string; pluginId: string; cache: string } {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) throw new Error("Codex 插件名称无效");
    const marketplace = `agentrulekit-${name}`;
    return { marketplace, pluginId: `${name}@${marketplace}`, cache: path.join(this.codexHome, "plugins/cache", marketplace, name) };
  }
  async inspect(name: string): Promise<{ installed: boolean; enabled: boolean; source?: string; cached: boolean }> {
    const identity = this.identity(name);
    const result = JSON.parse(await this.run(["plugin", "list", "--marketplace", identity.marketplace, "--available", "--json"]));
    if (!result || !Array.isArray(result.installed)) throw new Error("Codex 返回的插件状态不受支持");
    const item = [...result.installed, ...(result.available ?? [])].find((value: { pluginId?: string }) => value.pluginId === identity.pluginId);
    return { installed: !!item?.installed, enabled: !!item?.enabled, source: item?.marketplaceSource?.source, cached: (await readAssetFiles(identity.cache)).size > 0 };
  }
  async validate(name: string, receipt: UserAssetReceipt): Promise<string[]> {
    const identity = this.identity(name);
    if (!receipt.host || receipt.host.pluginId !== identity.pluginId || receipt.host.cachePath !== identity.cache) return ["Codex 安装记录缺少有效的宿主信息"];
    const state = await this.inspect(name);
    const problems: string[] = [];
    if (!state.installed) problems.push("Codex 中已找不到该插件");
    if (state.source && path.resolve(state.source) !== path.resolve(receipt.destination)) problems.push("Codex 插件来源已被修改");
    const hashes = assetFileHashes(await readAssetFiles(identity.cache));
    if (JSON.stringify(hashes) !== JSON.stringify(receipt.host.files)) problems.push("Codex 插件缓存已缺失、漂移或出现未知内容");
    return problems;
  }
  async install(name: string, destination: string, sourceFiles: Map<string, Buffer>): Promise<NonNullable<UserAssetReceipt["host"]>> {
    const identity = this.identity(name);
    await this.run(["plugin", "marketplace", "add", destination]);
    const result = JSON.parse(await this.run(["plugin", "add", identity.pluginId, "--json"]));
    if (result.pluginId !== identity.pluginId || typeof result.installedPath !== "string" || path.dirname(result.installedPath) !== identity.cache) throw new Error("Codex 安装结果与目标不一致");
    const installed = await readAssetFiles(result.installedPath);
    for (const [file, bytes] of sourceFiles) if (!installed.get(file)?.equals(bytes)) throw new Error(`Codex 未正确安装源文件：${file}`);
    const state = await this.inspect(name);
    if (!state.installed || !state.enabled) throw new Error("Codex 未确认插件安装成功");
    return { pluginId: identity.pluginId, cachePath: identity.cache, activePath: result.installedPath, files: assetFileHashes(await readAssetFiles(identity.cache)) };
  }
  async remove(name: string): Promise<void> {
    const identity = this.identity(name);
    if ((await this.inspect(name)).installed) await this.run(["plugin", "remove", identity.pluginId, "--json"]);
    await this.run(["plugin", "marketplace", "remove", identity.marketplace]);
  }
}
