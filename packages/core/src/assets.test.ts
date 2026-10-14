import assert from "node:assert/strict";
import test from "node:test";
import { assertAssetManifest, assertAssetTarget, type AssetManifest, type AssetTarget, type IdeAssetAdapter } from "./assets.js";

const manifest: AssetManifest = {
  schemaVersion: 1, id: "ui-design", kind: "capability-plugin", version: "1.0.0", title: "UI 设计",
  supportedIdes: ["codex"], dependencies: ["design-review"], requiredTools: [], ruleCategories: ["design"],
};
const adapter: IdeAssetAdapter = {
  id: "codex", supportedScopes: ["ide-user"],
  inspect: async () => ({ available: true }),
  planInstall: async () => { throw new Error("fixture"); },
  applyInstall: async () => { throw new Error("fixture"); },
  planUpdate: async () => { throw new Error("fixture"); },
  applyUpdate: async () => { throw new Error("fixture"); },
  planUninstall: async () => { throw new Error("fixture"); },
  applyUninstall: async () => { throw new Error("fixture"); },
  validate: async () => [],
};

test("插件和 Skills 只接受所选 IDE 的用户环境安装", () => {
  assert.doesNotThrow(() => assertAssetTarget(manifest, adapter, { ideId: "codex", scope: "ide-user" }));
  assert.throws(() => assertAssetTarget(manifest, adapter, { ideId: "trae", scope: "ide-user" }), /不支持/);
  assert.throws(() => assertAssetTarget(manifest, adapter, {
    ideId: "codex", scope: "project", projectRoot: "/tmp/project",
  } as unknown as AssetTarget), /不支持/);
  assert.throws(() => assertAssetTarget(manifest, adapter, {
    ideId: "codex", scope: "ide-user", projectRoot: "/tmp/project",
  } as unknown as AssetTarget), /不支持/);
  const projectAdapter = { ...adapter, supportedScopes: ["project"] } as unknown as IdeAssetAdapter;
  assert.throws(() => assertAssetTarget(manifest, projectAdapter, {
    ideId: "codex", scope: "project", projectRoot: "/tmp/project",
  } as unknown as AssetTarget), /不支持/);
});

test("资产清单拒绝自身依赖与重复 IDE", () => {
  assert.doesNotThrow(() => assertAssetManifest(manifest));
  assert.throws(() => assertAssetManifest({ ...manifest, dependencies: [manifest.id] }), /格式/);
  assert.throws(() => assertAssetManifest({ ...manifest, supportedIdes: ["codex", "codex"] }), /格式/);
  assert.throws(() => assertAssetManifest({ ...manifest, extra: "unexpected" }), /格式/);
  assert.throws(() => assertAssetManifest({ ...manifest, requiredTools: [42] }), /格式/);
  assert.throws(() => assertAssetManifest(null), /格式/);
});
