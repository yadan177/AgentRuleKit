import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function findProject(start) {
  let current = path.resolve(start);
  while (true) {
    try {
      const lockBytes = await readFile(path.join(current, ".agent-rules.lock.json"));
      await readFile(path.join(current, "agent-rules.yaml"));
      return { root: current, lockBytes };
    } catch { /* 继续查找父目录 */ }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

async function main() {
  let event;
  try {
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    event = JSON.parse(input);
  } catch { return; }
  const project = await findProject(event.cwd ?? process.cwd());
  const dataDir = process.env.PLUGIN_DATA;
  if (!project || !dataDir) return;
  let lock;
  try { lock = JSON.parse(project.lockBytes.toString("utf8")); } catch { return; }
  if (lock.sourceType !== "github" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(lock.source ?? "")) return;
  await mkdir(dataDir, { recursive: true });
  const cachePath = path.join(dataDir, `update-check-${sha256(project.root)}.json`);
  const lockDigest = sha256(project.lockBytes);
  let cache = {};
  try { cache = JSON.parse(await readFile(cachePath, "utf8")); } catch { /* 首次检查 */ }
  let version = cache.version;
  let digest = cache.digest;
  if (cache.lockDigest !== lockDigest || Date.now() - (cache.checkedAt ?? 0) >= 86_400_000) {
    try {
      const response = await fetch(`https://api.github.com/repos/${lock.source}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "AgentRuleKit" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return;
      const release = await response.json();
      const asset = release.assets?.find((item) => item.name === "agentrulekit-rulepacks.tar.gz");
      if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? "")) return;
      version = typeof release.tag_name === "string" ? release.tag_name.replace(/^v/, "") : undefined;
      if (!version) return;
      digest = asset.digest;
      const temporary = `${cachePath}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify({ lockDigest, checkedAt: Date.now(), version, digest }));
      await rename(temporary, cachePath);
    } catch { return; }
  }
  if (version === lock.sourceVersion && lock.sourceDigest && digest && digest !== lock.sourceDigest) {
    const message = `AgentRuleKit 安全警告：GitHub Release ${version} 的资产摘要与项目锁文件不一致，同版本资产可能被替换。提醒用户核查发布源，不要应用更新。`;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: message } }));
  } else if (version !== lock.sourceVersion || !lock.sourceDigest) {
    const message = `AgentRuleKit 规则源有新版本或尚未固定资产摘要 ${lock.sourceVersion ?? "未知"} → ${version}。在合适的下一次对话中提醒用户运行 agent-rule diff 审查；未经用户明确同意不要运行 update --apply。`;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: message } }));
  }
}

await main();
