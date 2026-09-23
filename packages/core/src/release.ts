import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { t, x } from "tar";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ASSET_NAME = "agentrulekit-rulepacks.tar.gz";
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 5_000;

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

export interface DownloadedRulepacks {
  sourceRoot: string;
  version: string;
  cleanup: () => Promise<void>;
}

interface GitHubRelease {
  tag_name: string;
  assets: Array<{ name: string; browser_download_url: string; digest?: string; size: number }>;
}

export async function findLatestRelease(repository: string, fetcher: typeof fetch = fetch): Promise<ReleaseInfo> {
  if (!REPOSITORY_PATTERN.test(repository)) throw new Error(`非法 GitHub 仓库标识：${repository}`);
  const response = await fetcher(`https://api.github.com/repos/${repository}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "AgentRuleKit" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`无法检查 GitHub Release：HTTP ${response.status}`);
  const release = await response.json() as GitHubRelease;
  if (!/^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(release.tag_name)) {
    throw new Error(`Release 标签格式不合法：${release.tag_name}`);
  }
  const asset = release.assets.find((item) => item.name === ASSET_NAME);
  if (!asset) throw new Error(`Release ${release.tag_name} 缺少 ${ASSET_NAME}`);
  if (!asset.digest || !/^sha256:[a-f0-9]{64}$/.test(asset.digest)) {
    throw new Error(`Release ${release.tag_name} 缺少可信的 SHA-256 摘要`);
  }
  if (asset.size < 1 || asset.size > MAX_ARCHIVE_BYTES) throw new Error("规则包压缩包体积超限");
  const expectedPrefix = `https://github.com/${repository}/releases/download/`;
  if (!asset.browser_download_url.startsWith(expectedPrefix)) throw new Error("Release 下载地址不可信");
  return { version: release.tag_name.replace(/^v/, ""), assetUrl: asset.browser_download_url, digest: asset.digest };
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
    await t({ file: archive, onReadEntry: (entry) => {
      entries++;
      extractedBytes += entry.size;
      if (entries > MAX_ENTRIES || extractedBytes > MAX_EXTRACTED_BYTES) throw new Error("规则包归档解压规模超限");
      const name = entry.path.replace(/\/$/, "");
      const parts = name.split("/");
      if (parts[0] !== "rulepacks" || parts.some((part) => part === ".." || part === "." || part === "") || name.includes("\\") || path.posix.isAbsolute(name) || !["File", "Directory"].includes(entry.type)) {
        throw new Error(`规则包归档包含不安全条目：${entry.path}`);
      }
    } });
    await x({ file: archive, cwd: sourceRoot, preservePaths: false, noMtime: true });
    await rm(archive);
    await readFile(path.join(sourceRoot, "rulepacks", "common", "pack.json"), "utf8");
    return { sourceRoot, version: release.version, cleanup: () => rm(sourceRoot, { recursive: true, force: true }) };
  } catch (error) {
    await rm(sourceRoot, { recursive: true, force: true });
    throw error;
  }
}
