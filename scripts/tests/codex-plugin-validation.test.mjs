import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateCodexPlugin } from "../validate-codex-plugin.mjs";

const repository = fileURLToPath(new URL("../../", import.meta.url));

test("Codex 插件结构完整且损坏的 Skill 或 Hook 会被检出", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-plugin-check-"));
  try {
    await mkdir(path.join(root, ".agents/plugins"), { recursive: true });
    await cp(path.join(repository, ".agents/plugins/marketplace.json"), path.join(root, ".agents/plugins/marketplace.json"));
    await cp(path.join(repository, "plugins/agent-rule-kit"), path.join(root, "plugins/agent-rule-kit"), { recursive: true });
    await cp(path.join(repository, "package.json"), path.join(root, "package.json"));
    assert.deepEqual(await validateCodexPlugin(root), []);

    const skill = path.join(root, "plugins/agent-rule-kit/skills/rules-review/SKILL.md");
    const original = await readFile(skill, "utf8");
    await writeFile(skill, original.replace("name: rules-review", "name: wrong-name"));
    assert.ok((await validateCodexPlugin(root)).some((issue) => issue.includes("rules-review")));
    await writeFile(skill, original);

    const hook = path.join(root, "plugins/agent-rule-kit/hooks/hooks.json");
    await writeFile(hook, JSON.stringify({ hooks: { SessionStart: [] } }));
    assert.ok((await validateCodexPlugin(root)).some((issue) => issue.includes("SessionStart")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
