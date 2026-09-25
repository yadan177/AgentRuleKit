import { findReleaseByTag, downloadRulepacks } from "../packages/core/dist/index.js";
import { pathToFileURL } from "node:url";

export async function verifyPublishedRelease(repository, tag, sourceCommit, fetcher = fetch) {
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(sourceCommit)) {
    throw new Error("当前提交哈希不合法");
  }
  const release = await findReleaseByTag(repository, tag, fetcher);
  const downloaded = await downloadRulepacks(release, fetcher);
  try {
    if (downloaded.sourceCommit !== sourceCommit) {
      throw new Error(`Release 规则包来源提交 ${downloaded.sourceCommit} 与当前标签提交 ${sourceCommit} 不一致`);
    }
    return release;
  } finally {
    await downloaded.cleanup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [repository, tag, sourceCommit] = process.argv.slice(2);
  try {
    const release = await verifyPublishedRelease(repository, tag, sourceCommit);
    console.log(`已核对 GitHub Release v${release.version} 的规则包摘要和来源提交`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
