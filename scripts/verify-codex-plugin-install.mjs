import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const mockFetch = fileURLToPath(new URL("./tests/fixtures/mock-release-fetch.mjs", import.meta.url));
const skillNames = ["rules-bootstrap", "rules-doc-impact", "rules-review", "rules-update"];

function run(command, args, options) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, ...options });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} 失败：\n${result.stdout ?? ""}\n${result.stderr ?? result.error ?? ""}`);
  return result.stdout;
}

const temporary = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-codex-install-"));
try {
  const environment = { ...process.env, CODEX_HOME: path.join(temporary, "codex-home") };
  await mkdir(environment.CODEX_HOME);
  const codex = (args, cwd = repository) => run("codex", args, { cwd, env: environment });
  const version = codex(["--version"]).trim();
  codex(["plugin", "marketplace", "add", repository, "--json"]);
  const installed = JSON.parse(codex(["plugin", "add", "agent-rule-kit@agentrulekit", "--json"]));
  assert.equal(installed.pluginId, "agent-rule-kit@agentrulekit");
  const installedRoot = await realpath(installed.installedPath);
  assert.ok(installedRoot.startsWith(`${await realpath(temporary)}${path.sep}`), "插件必须安装在隔离的 Codex 目录中");

  const listed = JSON.parse(codex(["plugin", "list", "--marketplace", "agentrulekit", "--json"]));
  assert.ok(listed.installed?.some((plugin) => plugin.pluginId === installed.pluginId && plugin.enabled));
  const prompt = JSON.parse(codex(["debug", "prompt-input", "测试可用技能"], temporary));
  const promptText = prompt.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "input_text")
    .map((item) => item.text).join("\n");
  for (const name of skillNames) {
    assert.ok(promptText.includes(`- agent-rule-kit:${name}:`), `Codex 提示输入未发现 ${name}`);
  }

  const hooks = JSON.parse(await readFile(path.join(installedRoot, "hooks", "hooks.json"), "utf8"));
  const sessionHooks = hooks.hooks?.SessionStart?.flatMap((event) => event.hooks ?? []) ?? [];
  assert.ok(sessionHooks.some((hook) => hook.command?.includes("${PLUGIN_ROOT}/hooks/session_start.mjs")));
  const project = path.join(temporary, "project");
  const projectConfig = "schemaVersion: 1\n";
  const projectLock = JSON.stringify({
    sourceType: "github", source: "yadan177/AgentRuleKit", sourceVersion: "0.1.0", sourceDigest: `sha256:${"a".repeat(64)}`,
  });
  await mkdir(project);
  await writeFile(path.join(project, "agent-rules.yaml"), projectConfig);
  await writeFile(path.join(project, ".agent-rules.lock.json"), projectLock);
  const requestLog = path.join(temporary, "requests.log");
  const output = run(process.execPath, ["--import", mockFetch, path.join(installedRoot, "hooks", "session_start.mjs")], {
    cwd: project,
    input: JSON.stringify({ cwd: project }),
    env: {
      ...environment,
      PLUGIN_ROOT: installedRoot,
      PLUGIN_DATA: path.join(temporary, "plugin-data"),
      AGENTRULEKIT_TEST_RELEASE: JSON.stringify({
        tag_name: "v0.2.0", assets: [{ name: "agentrulekit-rulepacks.tar.gz", digest: `sha256:${"b".repeat(64)}` }],
      }),
      AGENTRULEKIT_TEST_REQUEST_LOG: requestLog,
    },
  });
  const context = JSON.parse(output).hookSpecificOutput;
  assert.equal(context.hookEventName, "SessionStart");
  assert.match(context.additionalContext, /0\.1\.0 → 0\.2\.0/);
  assert.equal((await readFile(requestLog, "utf8")).trim().split("\n").length, 1);
  assert.equal(await readFile(path.join(project, ".agent-rules.lock.json"), "utf8"), projectLock);
  assert.deepEqual((await readdir(project)).sort(), [".agent-rules.lock.json", "agent-rules.yaml"]);
  console.log(`${version}：隔离安装成功，4 个 Skills 可发现，已安装 Hook 脚本可运行；桌面端信任授权仍待验收。`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
