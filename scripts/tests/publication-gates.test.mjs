import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const repository = fileURLToPath(new URL("../../", import.meta.url));

async function workflow(name) {
  const url = new URL(`.github/workflows/${name}`, `file://${repository}`);
  return parse(await readFile(url, "utf8"));
}

test("GitHub Release 与 npm 发布只允许在公开仓库的版本标签上运行", async () => {
  for (const [file, job] of [["ci.yml", "release"], ["publish-npm.yml", "publish"]]) {
    const parsed = await workflow(file);
    const condition = parsed.jobs?.[job]?.if;
    assert.equal(typeof condition, "string", `${file} 缺少 ${job} 作业条件`);
    assert.match(condition, /startsWith\(github\.ref,\s*'refs\/tags\/v'\)/, `${file} 必须仅在版本标签运行`);
    assert.match(condition, /github\.event\.repository\.private\s*==\s*false/, `${file} 私有仓库必须阻断发布`);
  }
});
