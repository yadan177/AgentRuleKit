import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { t, x } from "tar";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ASSET_NAME = "agentrulekit-rulepacks.tar.gz";
const RELEASE_MANIFEST = "agentrulekit-release.json";
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 5_000;
const MAX_DECOMPRESSION_RATIO = 20;

export interface ReleaseInfo {
  version: string;
  assetUrl: string;
  digest: string;
}

export function assertReleaseAssetUnchanged(
  installed: { sourceVersion?: string; sourceDigest?: string },
  latest: ReleaseInfo,
): void {
  if (installed.sourceVersion === latest.version && installed.sourceDigest && installed.sourceDigest !== latest.digest) {
    throw new Error(`GitHub Release ${latest.version} 的资产摘要与已安装版本不一致；同版本资产可能已被替换，拒绝更新`);
  }
}

function stableVersionParts(version: string): bigint[] {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`无法比较非 stable 规则版本：${version}`);
  return version.split(".").map(BigInt);
}

export function assertReleaseNotOlder(
  installed: { sourceVersion?: string },
  latest: { version: string },
): void {
  if (!installed.sourceVersion) return;
  const current = stableVersionParts(installed.sourceVersion);
  const candidate = stableVersionParts(latest.version);
  for (let index = 0; index < current.length; index++) {
    if (candidate[index]! < current[index]!) {
      throw new Error(`GitHub 最新 Release ${latest.version} 低于项目锁定版本 ${installed.sourceVersion}；拒绝自动降级，请核查发布源`);
    }
    if (candidate[index]! > current[index]!) return;
  }
}

export interface DownloadedRulepacks {
  sourceRoot: string;
  version: string;
  sourceCommit: string;
  cleanup: () => Promise<void>;
}

interface GitHubRelease {
  tag_name: string;
  draft?: boolean;
  prerelease?: boolean;
  assets: Array<{ name: string; browser_download_url: string; digest?: string; size: number }>;
}

async function findRelease(repository: string, endpoint: string, fetcher: typeof fetch, expectedTag?: string): Promise<ReleaseInfo> {
  if (!REPOSITORY_PATTERN.test(repository)) throw new Error(`非法 GitHub 仓库标识：${repository}`);
  const response = await fetcher(`https://api.github.com/repos/${repository}/releases/${endpoint}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "AgentRuleKit" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`无法检查 GitHub Release：HTTP ${response.status}`);
  const release = await response.json() as GitHubRelease;
  if (!/^v?\d+\.\d+\.\d+$/.test(release.tag_name)) {
    throw new Error(`Release 标签不符合 stable 版本格式：${release.tag_name}`);
  }
  if (expectedTag && release.tag_name !== expectedTag) throw new Error(`GitHub Release 标签与请求的 ${expectedTag} 不一致`);
  if (release.draft || release.prerelease) throw new Error(`Release ${release.tag_name} 尚未正式发布`);
  const asset = Array.isArray(release.assets) ? release.assets.find((item) => item.name === ASSET_NAME) : undefined;
  if (!asset) throw new Error(`Release ${release.tag_name} 缺少 ${ASSET_NAME}`);
  if (!asset.digest || !/^sha256:[a-f0-9]{64}$/.test(asset.digest)) {
    throw new Error(`Release ${release.tag_name} 缺少可信的 SHA-256 摘要`);
  }
  if (!Number.isInteger(asset.size) || asset.size < 1 || asset.size > MAX_ARCHIVE_BYTES) throw new Error("规则包压缩包体积超限");
  const expectedUrl = `https://github.com/${repository}/releases/download/${release.tag_name}/${ASSET_NAME}`;
  if (asset.browser_download_url !== expectedUrl) throw new Error("Release 下载地址不可信");
  return { version: release.tag_name.replace(/^v/, ""), assetUrl: asset.browser_download_url, digest: asset.digest };
}

export async function findLatestRelease(repository: string, fetcher: typeof fetch = fetch): Promise<ReleaseInfo> {
  return findRelease(repository, "latest", fetcher);
}

export async function findReleaseByTag(repository: string, tag: string, fetcher: typeof fetch = fetch): Promise<ReleaseInfo> {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`非法 stable Release 标签：${tag}`);
  return findRelease(repository, `tags/${tag}`, fetcher, tag);
}

export async function downloadRulepacks(release: ReleaseInfo, fetcher: typeof fetch = fetch): Promise<DownloadedRulepacks> {
  const response = await fetcher(release.assetUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`规则包下载失败：HTTP ${response.status}`);
  const declaredSize = Number(response.headers.get("content-length"));
  if (declaredSize > MAX_ARCHIVE_BYTES) throw new Error("规则包压缩包体积超限");
  if (!response.body) throw new Error("规则包下载结果为空");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_ARCHIVE_BYTES) {
      await reader.cancel();
      throw new Error("规则包压缩包体积超限");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  if (bytes.length < 1 || bytes.length > MAX_ARCHIVE_BYTES) throw new Error("规则包压缩包体积超限");
  const actual = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (actual !== release.digest) throw new Error("规则包 SHA-256 校验失败；未修改项目");
  const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-release-"));
  const archive = path.join(sourceRoot, "rulepacks.tar.gz");
  try {
    await writeFile(archive, bytes);
    let entries = 0;
    let extractedBytes = 0;
    const seen = new Set<string>();
    await new Promise<void>((resolve, reject) => {
      const parser = t({ strict: true, maxDecompressionRatio: MAX_DECOMPRESSION_RATIO, onReadEntry: (entry) => {
        entries++;
        extractedBytes += entry.size;
        if (entries > MAX_ENTRIES || extractedBytes > MAX_EXTRACTED_BYTES) {
          parser.abort(new Error("规则包归档解压规模超限"));
          return;
        }
        const name = entry.path.replace(/\/$/, "");
        const parts = name.split("/");
        if (seen.has(name)) {
          parser.abort(new Error(`规则包归档包含重复条目：${name}`));
          return;
        }
        seen.add(name);
        const manifestEntry = name === RELEASE_MANIFEST && entry.type === "File" && entry.size <= 1024;
        const ruleEntry = parts[0] === "rulepacks" && !parts.some((part) => part === ".." || part === "." || part === "") && !name.includes("\\") && !path.posix.isAbsolute(name) && ["File", "Directory"].includes(entry.type);
        if (!manifestEntry && !ruleEntry) parser.abort(new Error(`规则包归档包含不安全条目：${entry.path}`));
      } });
      const input = createReadStream(archive);
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        input.destroy();
        reject(error);
      };
      parser.on("error", fail);
      parser.on("end", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      input.on("error", fail);
      input.pipe(parser);
    });
    if (!seen.has(RELEASE_MANIFEST)) throw new Error("规则包归档缺少来源提交记录");
    await x({ file: archive, cwd: sourceRoot, preservePaths: false, noMtime: true, strict: true, maxDecompressionRatio: MAX_DECOMPRESSION_RATIO });
    await rm(archive);
    const metadata = JSON.parse(await readFile(path.join(sourceRoot, RELEASE_MANIFEST), "utf8")) as { schemaVersion?: unknown; version?: unknown; sourceCommit?: unknown };
    if (metadata.schemaVersion !== 1 || metadata.version !== release.version || typeof metadata.sourceCommit !== "string" || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(metadata.sourceCommit)) {
      throw new Error("规则包来源提交记录与 Release 版本不匹配或格式不合法");
    }
    await readFile(path.join(sourceRoot, "rulepacks", "common", "pack.json"), "utf8");
    return { sourceRoot, version: release.version, sourceCommit: metadata.sourceCommit, cleanup: () => rm(sourceRoot, { recursive: true, force: true }) };
  } catch (error) {
    await rm(sourceRoot, { recursive: true, force: true });
    throw error;
  }
}
