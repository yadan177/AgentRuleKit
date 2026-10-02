import type { ValidationIssue } from "./types.js";
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

export interface AssetFileChange {
  path: string;
  action: "add" | "modify" | "remove";
  before?: string;
  after?: string;
}

interface AssetPlanBase {
  target: AssetTarget;
  changes: AssetFileChange[];
  conflicts: ValidationIssue[];
  retainedPaths: string[];
}

export type AssetPlan = AssetPlanBase & (
  | { kind: "install"; manifest: AssetManifest; previous?: never }
  | { kind: "update"; manifest: AssetManifest; previous: InstalledAsset }
  | { kind: "uninstall"; manifest?: never; previous: InstalledAsset }
);

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

function isIdList(value: unknown, required = false): value is string[] {
  return Array.isArray(value) && (!required || value.length > 0) &&
    value.every((id) => typeof id === "string" && ID.test(id)) && new Set(value).size === value.length;
}

export function assertAssetManifest(value: unknown): asserts value is AssetManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("资产清单格式不正确");
  const manifest = value as Partial<AssetManifest>;
  if (Object.keys(manifest).some((key) => ![
    "schemaVersion", "id", "kind", "version", "title", "supportedIdes", "dependencies", "requiredTools", "ruleCategories",
  ].includes(key)) ||
    manifest.schemaVersion !== 1 || typeof manifest.id !== "string" || !ID.test(manifest.id) ||
    (manifest.kind !== "skill" && manifest.kind !== "capability-plugin") ||
    typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(manifest.version) ||
    typeof manifest.title !== "string" || !manifest.title.trim() ||
    !isIdList(manifest.supportedIdes, true) || !isIdList(manifest.dependencies) ||
    !isIdList(manifest.requiredTools) || !isIdList(manifest.ruleCategories) ||
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
