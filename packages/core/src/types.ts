export const SUPPORTED_STACKS = [
  "python",
  "go",
  "java",
  "javascript",
  "typescript",
  "unity",
] as const;

export type StackId = (typeof SUPPORTED_STACKS)[number];

export interface DetectionEvidence {
  path: string;
  reason: string;
}

export interface DetectedStack {
  id: StackId;
  confidence: "high" | "medium";
  evidence: DetectionEvidence[];
}

export interface DetectionResult {
  root: string;
  stacks: DetectedStack[];
}

export interface ProjectConfig {
  schemaVersion: 1;
  source: {
    type: "workspace" | "github";
    path?: string;
    repository?: string;
  };
  rulepacks: string[];
  targets: string[];
  project: {
    overrides: string;
  };
  updates: {
    channel: "stable" | "preview";
    strategy: "manual" | "pull-request";
  };
}

export interface ProjectLock {
  schemaVersion: 1;
  toolkitVersion: string;
  sourceType: "workspace" | "github";
  source: string;
  sourceVersion?: string;
  sourceDigest?: string;
  sourceCommit?: string;
  rulepacks: Record<string, string>;
  targets: Record<string, string>;
  managedFiles: Record<string, string>;
  managedBlockDigest: string;
  entryOrigin?: "existing" | "generated";
}

export interface ProjectChange {
  path: string;
  action: "add" | "modify" | "remove";
  before?: string;
  after?: string;
}

export interface ProjectPlan {
  changes: ProjectChange[];
  conflicts: ValidationIssue[];
  from: Record<string, string>;
  to: Record<string, string>;
}

export interface UninstallPlan {
  changes: ProjectChange[];
  retainedPaths: string[];
  conflicts: ValidationIssue[];
}

export interface RulePackManifest {
  $schema?: string;
  id: string;
  version: string;
  status: "scaffolded" | "ready" | "deprecated";
  kind: "development" | "documentation" | "common";
  entry: string | null;
  dependencies: string[];
  rules: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
