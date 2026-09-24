import { readFile } from "node:fs/promises";

const statePath = process.env.AGENTRULEKIT_TEST_RELEASE_STATE;
if (!statePath) throw new Error("测试缺少 Release 状态文件");
const state = JSON.parse(await readFile(statePath, "utf8"));
const metadataUrl = "https://api.github.com/repos/yadan177/AgentRuleKit/releases/latest";
const assetUrl = state.release.assets?.[0]?.browser_download_url;

globalThis.fetch = async (input) => {
  const url = String(input);
  if (url === metadataUrl) return new Response(JSON.stringify(state.release), { status: 200 });
  if (url === assetUrl) {
    const bytes = await readFile(state.assetPath);
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: { "content-length": String(bytes.length) },
    });
  }
  throw new Error(`测试中出现意外网络请求：${url}`);
};
