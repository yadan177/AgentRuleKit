import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const maxTextBlobBytes = 2 * 1024 * 1024;

const patterns = [
  ["private-key-header", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ["openai-token", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["slack-token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ["stripe-live-secret", /\bsk_live_[A-Za-z0-9]{16,}\b/g],
  ["long-bearer-token", /\bBearer\s+[A-Za-z0-9._~+/-]{32,}={0,2}\b/gi],
];

const git = (args, options = {}) => execFileSync("git", args, {
  cwd: repository,
  maxBuffer: 32 * 1024 * 1024,
  ...options,
});

const lineAt = (text, index) => 1 + (text.slice(0, index).match(/\n/g) ?? []).length;

export function scanText(text) {
  const findings = [];
  const urlSpans = [];
  for (const [category, pattern] of patterns) {
    for (const match of text.matchAll(pattern)) {
      findings.push({ category, line: lineAt(text, match.index) });
    }
  }
  for (const match of text.matchAll(/https?:\/\/[^\s<>`"']+/gi)) {
    urlSpans.push([match.index, match.index + match[0].length]);
    let url;
    try { url = new URL(match[0].replace(/[).,;]+$/, "")); }
    catch { continue; }
    const host = url.hostname.toLowerCase();
    if (url.username || url.password) {
      findings.push({ category: "url-with-userinfo", line: lineAt(text, match.index) });
    }
    if (/(?:^|\.)(?:internal|corp|intra|lan|local)$/.test(host) ||
        /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) {
      findings.push({ category: "internal-url", line: lineAt(text, match.index) });
    }
  }
  for (const match of text.matchAll(/\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi)) {
    if (urlSpans.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const domain = match[1].toLowerCase();
    if (!["example.com", "example.org", "example.net", "users.noreply.github.com"].includes(domain)) {
      findings.push({ category: "non-example-email", line: lineAt(text, match.index) });
    }
  }
  return findings;
}

function main() {
  const details = process.argv.includes("--review-locations");
  if (process.argv.slice(2).some((arg) => arg !== "--review-locations")) {
    throw new Error("用法：node scripts/audit-git-history.mjs [--review-locations]");
  }
  const head = git(["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const commits = git(["rev-list", "--all"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const objects = git(["rev-list", "--objects", "--all"], { encoding: "utf8" }).trim().split("\n");
  const paths = new Map(objects.map((line) => [line.slice(0, 40), line.slice(41)]));
  const shas = [...paths.keys()];
  const check = spawnSync("git", ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], {
    cwd: repository,
    input: `${shas.join("\n")}\n`,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (check.status !== 0) throw new Error("Git 对象元数据读取失败");

  const summary = {
    head,
    reachableCommits: commits.length,
    reachableObjects: shas.length,
    reachableBlobs: 0,
    textBlobsScanned: 0,
    binaryBlobsSkipped: 0,
    oversizedBlobsSkipped: 0,
    candidateCounts: {},
  };
  const locations = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const row of check.stdout.trim().split("\n")) {
    const match = row.match(/^([a-f0-9]{40}) blob (\d+)$/);
    if (!match) continue;
    summary.reachableBlobs += 1;
    const [, sha, sizeText] = match;
    if (Number(sizeText) > maxTextBlobBytes) {
      summary.oversizedBlobsSkipped += 1;
      continue;
    }
    const data = git(["cat-file", "blob", sha]);
    let text;
    try {
      if (data.includes(0)) throw new Error("NUL byte");
      text = decoder.decode(data);
    } catch {
      summary.binaryBlobsSkipped += 1;
      continue;
    }
    summary.textBlobsScanned += 1;
    for (const finding of scanText(text)) {
      summary.candidateCounts[finding.category] = (summary.candidateCounts[finding.category] ?? 0) + 1;
      if (details) locations.push({ category: finding.category, object: sha.slice(0, 12), path: paths.get(sha) || null, line: finding.line });
    }
  }
  const metadata = git(["log", "--all", "--format=%ae%n%ce"], { encoding: "utf8" });
  const emails = new Set(metadata.split("\n").filter((value) => value.includes("@")));
  summary.commitMetadataNonExampleEmailCount = [...emails].filter((value) =>
    !/@(?:example\.(?:com|org|net)|users\.noreply\.github\.com)$/i.test(value)).length;
  console.log(JSON.stringify(summary, null, 2));
  if (details) {
    console.log("候选位置（不输出匹配值）：");
    console.log(JSON.stringify(locations, null, 2));
  }
  console.log("模式筛查不是内容授权、人工隐私审查或无秘密证明。只覆盖本地 --all 引用可达对象中不超过 2 MiB 的 UTF-8 文本 blob；不包含未获取的远端引用。");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
