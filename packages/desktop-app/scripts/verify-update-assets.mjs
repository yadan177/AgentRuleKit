import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import yaml from "yaml";

const root = path.resolve(import.meta.dirname, "..");
const version = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
const manual = process.argv.includes("--manual");
const mac = process.platform === "darwin";
const windows = process.platform === "win32";
assert.ok(mac || windows, "仅支持在 macOS 或 Windows 上核对桌面更新资产");
const basename = mac ? `AgentRuleKit-Desktop-${version}-macOS-arm64` : `AgentRuleKit-Desktop-${version}-Windows-x64`;
const required = mac ? [`${basename}.dmg`] : manual ? [`${basename}.exe`] : [`${basename}.exe`, "latest.yml"];
for (const name of required) assert.ok(existsSync(path.join(root, "release", name)), `缺少更新资产 ${name}`);
if (windows && !manual) {
  const metadata = yaml.parse(readFileSync(path.join(root, "release", "latest.yml"), "utf8"));
  assert.equal(metadata.version, version);
  assert.ok(metadata.files.some((file) => file.url === `${basename}.exe`));
}
console.log(`桌面更新资产已核对：${required.join("、")}`);
