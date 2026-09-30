import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { compareDesktopVersions, fetchDesktopRelease, matchesUpdateInfo, selectDesktopRelease } = require("../build/desktop-releases.cjs");

function desktop(version, { draft = false, complete = true, platform = "darwin" } = {}) {
  return {
    tag_name: `desktop-v${version}`, draft, prerelease: false,
    assets: complete ? platform === "darwin"
      ? [{ name: `AgentRuleKit-Desktop-${version}-macOS-arm64.dmg` }]
      : [{ name: "latest.yml" }, { name: `AgentRuleKit-Desktop-${version}-Windows-x64.exe` }]
      : [{ name: platform === "darwin" ? `AgentRuleKit-Desktop-${version}-macOS-arm64.zip` : `AgentRuleKit-Desktop-${version}-Windows-x64.exe` }],
  };
}

test("软件版本只从完整的 desktop Release 选取，忽略规则包、草稿和不完整安装包", () => {
  const releases = [
    { tag_name: "v9.0.0", assets: [{ name: "AgentRuleKit-Desktop-9.0.0-macOS-arm64.dmg" }] },
    desktop("1.4.0", { draft: true }),
    desktop("1.3.0", { complete: false }),
    desktop("1.2.0"), desktop("1.10.0"),
  ];
  assert.equal(selectDesktopRelease(releases, "darwin", "arm64")?.version, "1.10.0");
  assert.equal(selectDesktopRelease(releases, "darwin", "arm64")?.downloadUrl,
    "https://github.com/yadan177/AgentRuleKit/releases/download/desktop-v1.10.0/AgentRuleKit-Desktop-1.10.0-macOS-arm64.dmg");
  assert.equal(selectDesktopRelease(releases, "win32", "x64"), undefined);
  assert.equal(selectDesktopRelease(releases, "darwin", "x64"), undefined);
  assert.equal(compareDesktopVersions("1.10.0", "1.2.0"), 1);
  assert.equal(compareDesktopVersions("1.2.0", "1.2.0"), 0);
  assert.throws(() => compareDesktopVersions("1.2", "1.2.0"));
});

test("Windows 下载前校验更新清单；Mac 手动安装不使用更新清单", () => {
  const exe = "AgentRuleKit-Desktop-1.2.0-Windows-x64.exe";
  assert.equal(matchesUpdateInfo({ version: "1.2.0", files: [{ url: exe }] }, "1.2.0", "win32", "x64"), true);
  assert.equal(matchesUpdateInfo({ version: "1.2.0", files: [{ url: exe }, { url: "https://example.test/other.exe" }] }, "1.2.0", "win32", "x64"), false);
  assert.equal(matchesUpdateInfo({ version: "1.2.0", files: [{ url: exe }] }, "1.2.0", "darwin", "arm64"), false);
  assert.equal(matchesUpdateInfo({ version: "1.3.0", files: [{ url: exe }] }, "1.2.0", "win32", "x64"), false);
  assert.equal(selectDesktopRelease([desktop("1.2.0", { platform: "win32", complete: false })], "win32", "x64"), undefined);
});

test("软件版本检查固定访问公开 GitHub Release 列表，不使用规则包的 latest 接口", async () => {
  let requested = "";
  const release = desktop("1.2.0", { platform: "win32" });
  const selected = await fetchDesktopRelease("win32", "x64", async (url) => {
    requested = url;
    return new Response(JSON.stringify([release]), { status: 200 });
  });
  assert.match(requested, /\/releases\?per_page=100$/);
  assert.equal(selected?.feedUrl, "https://github.com/yadan177/AgentRuleKit/releases/download/desktop-v1.2.0/");
  assert.equal(selected?.pageUrl, "https://github.com/yadan177/AgentRuleKit/releases/tag/desktop-v1.2.0");
  await assert.rejects(fetchDesktopRelease("win32", "x64", async () => new Response("unavailable", { status: 503 })), /HTTP 503/);
});
