import skill from "./skills/toolbox-product-design/SKILL.md";
import agent from "./skills/toolbox-product-design/agents/openai.yaml";

export const PRODUCT_DESIGN_SKILLS = ["audit", "design-qa", "get-context", "ideate", "image-to-code", "index", "research", "share", "url-to-code", "user-context"];
export function productDesignDeliveryFiles(name: string, version: string, paths: Set<string>): Record<string, string> {
  if (name !== "product-design" || version !== "0.1.56") throw new Error("本次 TraeWork 适配仅支持 Product Design 0.1.56；其他包需独立适配");
  for (const id of PRODUCT_DESIGN_SKILLS) {
    if (!paths.has(`skills/${id}/SKILL.md`)) throw new Error(`源插件缺少 Skill：${id}`);
  }
  for (const file of ["references/communication-protocol.md", "references/critical-overrides.md"]) {
    if (!paths.has(file)) throw new Error(`源插件缺少引用：${file}`);
  }
  return { "SKILL.md": skill, "agents/openai.yaml": agent };
}
