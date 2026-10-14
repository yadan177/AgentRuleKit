import path from "node:path";
import { productDesignDeliveryFiles } from "./product-design.ts";

/** Documented local user-skill directory; this does not provision cloud skills or native plugins. */
export function traeWorkSkillRoot(userHome: string): string { return path.join(userHome, ".trae-cn/skills"); }
export function traeWorkDelivery(source: { kind: string; name: string; version: string; delivery: string }, files: Map<string, Buffer>): { name: string; files: Map<string, Buffer> } {
  if (source.kind === "skill") return { name: source.name, files: new Map(files) };
  if (source.delivery !== "traework-skill") throw new Error("该插件尚无 TraeWork 适配，不能忽略工具或 Hook 后安装");
  const result = new Map([...files].map(([file, content]) => [`source/${file}`, content]));
  for (const [file, content] of Object.entries(productDesignDeliveryFiles(source.name, source.version, new Set(files.keys())))) result.set(file, Buffer.from(content));
  return { name: "toolbox-product-design", files: result };
}
