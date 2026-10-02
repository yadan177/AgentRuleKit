import assert from "node:assert/strict";
import test from "node:test";
import { assertAssetManifest, assertAssetTarget, type AssetManifest, type IdeAssetAdapter } from "./assets.js";

const manifest: AssetManifest = {
  schemaVersion: 1, id: "ui-design", kind: "capability-plugin", version: "1.0.0", title: "UI 设计",
  supportedIdes: ["codex"], dependencies: ["design-review"], requiredTools: [], ruleCategories: ["design"],
};
const adapter: IdeAssetAdapter = {
  id: "codex", supportedScopes: ["ide-user"],
  inspect: async () => ({ available: true }),
  planInstall: async () => { throw new Error("fixture"); },
  applyInstall: async () => { throw new Error("fixture"); },
  planUninstall: async () => { throw new Error("fixture"); },
  applyUninstall: async () => { throw new Error("fixture"); },
  validate: async () => [],
};

test("通用资产与宿主交付包有独立身份和安装范围", () => {
  assert.doesNotThrow(() => assertAssetTarget(manifest, adapter, { ideId: "codex", scope: "ide-user" }));
  assert.throws(() => assertAssetTarget(manifest, adapter, { ideId: "trae", scope: "ide-user" }), /不支持/);
  assert.throws(() => assertAssetTarget(manifest, adapter, { ideId: "codex", scope: "project", projectRoot: "/tmp/project" }), /不支持/);
  assert.throws(() => assertAssetTarget(manifest, adapter, { ideId: "codex", scope: "ide-user", projectRoot: "/tmp/project" }), /不支持/);
});

test("资产清单拒绝自身依赖与重复 IDE", () => {
  assert.doesNotThrow(() => assertAssetManifest(manifest));
  assert.throws(() => assertAssetManifest({ ...manifest, dependencies: [manifest.id] }), /格式/);
  assert.throws(() => assertAssetManifest({ ...manifest, supportedIdes: ["codex", "codex"] }), /格式/);
});
