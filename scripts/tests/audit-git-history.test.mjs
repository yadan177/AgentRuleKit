import assert from "node:assert/strict";
import { test } from "node:test";
import { scanText } from "../audit-git-history.mjs";

test("仓库包路径中的 @ 不会误报 URL 凭据", () => {
  assert.deepEqual(scanText("https://registry.npmjs.org/@types/node"), []);
});

test("URL 用户信息只提示位置，不把同一段误判为邮箱", () => {
  const candidate = "https://example-key" + "@o0.ingest.sentry.io/1";
  assert.deepEqual(scanText(candidate), [{ category: "url-with-userinfo", line: 1 }]);
});

test("识别非示例邮箱、内部 URL 和常见令牌格式", () => {
  const sample = [
    "person" + "@company.test",
    "https://service.internal/api",
    "ghp_" + "x".repeat(20),
  ].join("\n");
  assert.deepEqual(scanText(sample), [
    { category: "github-token", line: 3 },
    { category: "internal-url", line: 2 },
    { category: "non-example-email", line: 1 },
  ]);
});
