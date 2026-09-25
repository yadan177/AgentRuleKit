import type { ProjectConfig } from "./types.js";

/** 目标工具负责描述自己的项目入口；核心只处理文件生命周期。 */
export interface TargetAdapter {
  id: string;
  entryFile: string;
  blockStart: string;
  blockEnd: string;
  renderManagedBlock(config: ProjectConfig, entries: Record<string, string>): string;
}

export function assertTargetAdapter(adapter: TargetAdapter): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(adapter.id)) {
    throw new Error(`目标工具 ID 不合法：${adapter.id}`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(adapter.entryFile)) {
    throw new Error(`目标工具入口必须是工程根目录中的普通文件：${adapter.entryFile}`);
  }
  if (["agent-rules.yaml", ".agent-rules.lock.json"].includes(adapter.entryFile)) {
    throw new Error(`目标工具入口不能占用 AgentRuleKit 控制文件：${adapter.entryFile}`);
  }
  if (!adapter.blockStart || !adapter.blockEnd || adapter.blockStart === adapter.blockEnd) {
    throw new Error("目标工具受控区块边界不合法");
  }
}

function markerPositions(existing: string, adapter: TargetAdapter): { start: number; end: number; valid: boolean } {
  const start = existing.indexOf(adapter.blockStart);
  const end = existing.indexOf(adapter.blockEnd);
  const valid = (start < 0 && end < 0) || (
    start >= 0 && end > start &&
    existing.indexOf(adapter.blockStart, start + adapter.blockStart.length) < 0 &&
    existing.indexOf(adapter.blockEnd, end + adapter.blockEnd.length) < 0
  );
  return { start, end, valid };
}

export function extractManagedBlock(existing: string, adapter: TargetAdapter): string | undefined {
  const { start, end, valid } = markerPositions(existing, adapter);
  if (!valid || start < 0) return undefined;
  return existing.slice(start, end + adapter.blockEnd.length);
}

export function mergeManagedBlock(existing: string, block: string, adapter: TargetAdapter): string {
  const { start, end, valid } = markerPositions(existing, adapter);
  if (!valid) {
    throw new Error(`${adapter.entryFile} 包含边界不完整的 AgentRuleKit 受控区块`);
  }
  if (start !== -1) {
    const endOffset = end + adapter.blockEnd.length;
    return `${existing.slice(0, start)}${block}${existing.slice(endOffset)}`;
  }
  const prefix = existing.trimEnd();
  return prefix ? `${prefix}\n\n${block}\n` : `${block}\n`;
}
