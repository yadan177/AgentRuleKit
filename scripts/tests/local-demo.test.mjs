import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../", import.meta.url));

test("本地演示在临时工程跑通安装、差异预览和显式更新", () => {
  const script = path.join(repository, "examples", "local-demo.mjs");
  const result = spawnSync(process.execPath, [script], { cwd: repository, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /diff --agent-rule \.agent-rules\/common\/entry\.md/);
  assert.match(result.stdout, /update --apply → validate：更新成功/);
  assert.doesNotMatch(result.stdout, /演示工程已保留供检查/);
});
