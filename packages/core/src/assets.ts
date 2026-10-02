import type { ProjectChange, ValidationIssue } from "./types.js";
import path from "node:path";

/** Toolbox catalog entry. An IDE plugin bundle is an adapter output, not this asset. */
export type AssetKind = "skill" | "capability-plugin";
export type AssetScope = "ide-user" | "project";

export interface AssetManifest {
  schemaVersion: 1;
  id: string;
  kind: AssetKind;
  version: string;
  title: string;
  supportedIdes: string[];
  dependencies: string[];
  requiredTools: string[];
  ruleCategories: string[];
}

export interface AssetTarget {
  ideId: string;
  scope: AssetScope;
  projectRoot?: string;
}

export interface InstalledAsset {
  id: string;
  kind: AssetKind;
  version: string;
  target: AssetTarget;
  installedAt: string;
  /** Relative path -> SHA-256. Only these files may be updated or removed. */
  managedFiles: Record<string, string>;
}

export interface AssetPlan {
  kind: "install" | "update" | "uninstall";
  manifest: AssetManifest;
  target: AssetTarget;
  previous?: InstalledAsset;
  changes: ProjectChange[];
  conflicts: ValidationIssue[];
  retainedPaths: string[];
}

/** IDE-specific delivery is implemented only when a real asset is shipped. */
export interface IdeAssetAdapter {
  id: string;
  supportedScopes: readonly AssetScope[];
  inspect(target: AssetTarget): Promise<{ available: boolean; reason?: string }>;
  planInstall(manifest: AssetManifest, target: AssetTarget): Promise<AssetPlan>;
  applyInstall(plan: AssetPlan): Promise<InstalledAsset>;
  planUpdate(manifest: AssetManifest, receipt: InstalledAsset): Promise<AssetPlan>;
  applyUpdate(plan: AssetPlan): Promise<InstalledAsset>;
  planUninstall(receipt: InstalledAsset): Promise<AssetPlan>;
  applyUninstall(plan: AssetPlan): Promise<void>;
  validate(receipt: InstalledAsset): Promise<ValidationIssue[]>;
}

const ID = /^[a-z0-9][a-z0-9-]*$/;

export function assertAssetManifest(manifest: AssetManifest): void {
  if (manifest.schemaVersion !== 1 || !ID.test(manifest.id) ||
    !["skill", "capability-plugin"].includes(manifest.kind) ||
    !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(manifest.version) ||
    typeof manifest.title !== "string" || !manifest.title.trim() || !Array.isArray(manifest.supportedIdes) ||
    manifest.supportedIdes.length === 0 || manifest.supportedIdes.some((id) => !ID.test(id)) ||
    !Array.isArray(manifest.dependencies) || manifest.dependencies.some((id) => !ID.test(id)) ||
    !Array.isArray(manifest.requiredTools) || manifest.requiredTools.some((id) => !ID.test(id)) ||
    !Array.isArray(manifest.ruleCategories) || manifest.ruleCategories.some((id) => !ID.test(id)) ||
    new Set(manifest.supportedIdes).size !== manifest.supportedIdes.length ||
    new Set(manifest.dependencies).size !== manifest.dependencies.length ||
    new Set(manifest.requiredTools).size !== manifest.requiredTools.length ||
    new Set(manifest.ruleCategories).size !== manifest.ruleCategories.length ||
    manifest.dependencies.includes(manifest.id)) {
    throw new Error("资产清单格式不正确");
  }
}

export function assertAssetTarget(manifest: AssetManifest, adapter: IdeAssetAdapter, target: AssetTarget): void {
  assertAssetManifest(manifest);
  if (target.ideId !== adapter.id || !manifest.supportedIdes.includes(target.ideId) ||
    !adapter.supportedScopes.includes(target.scope) ||
    (target.scope === "project" ? !target.projectRoot || !path.isAbsolute(target.projectRoot) : !!target.projectRoot)) {
    throw new Error("资产不支持所选 IDE 或安装范围");
  }
}
