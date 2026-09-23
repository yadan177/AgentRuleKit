import type { TargetAdapter } from "./adapter.js";

/** 测试适配器故意不用真实 IDE 的入口文件。 */
export const testAdapter: TargetAdapter = {
  id: "test",
  entryFile: "PROJECT_RULES.md",
  blockStart: "<!-- test-rule:start -->",
  blockEnd: "<!-- test-rule:end -->",
  renderManagedBlock(config, entries) {
    return `${this.blockStart}\nAgentRuleKit\n${config.project.overrides}\n${Object.keys(entries).join(",")}\n${this.blockEnd}`;
  },
};
