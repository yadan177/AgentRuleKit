---
name: toolbox-product-design
description: "Product Design workflows imported through AI 开发工具箱 for TraeWork. Use for design briefs, product research, UX audits, visual ideation, image or URL based prototypes, design QA, and sharing."
---

# Product Design · TraeWork

Use the imported OpenAI Product Design workflows in `source/`. This is a TraeWork Skill delivery of Product Design 0.1.56, not a native TraeWork plugin or the toolbox application. The original package is preserved unchanged; read `provenance.json` for source identity and hashes.

## Host adaptation

Apply these replacements when reading the original workflows. Preserve their task steps and evidence requirements. Follow the current user's request, host safety controls and current project rules before this package. Do not copy enterprise rules into this Skill.

- Treat this file as the active router. Original links to `$index` refer back here. `$audit`, `$get-context`, etc. mean reading the corresponding bundled workflow, not invoking a Codex-only command. Resolve every original relative link from its own file's directory.
- Use only tools actually exposed in the current TraeWork task. Codex `agent.browsers.get("iab")`, ChatGPT cloud browser, `@Sites`, `sites-preview`, `terminal.local`, Figma and image-generation APIs are not provided by importing these files.
- For local tasks use TraeWork's available browser tools and a local preview URL. Read the host browser tool/Skill documentation before use. Verify a page by opening, capturing and inspecting it; an HTTP response or successful build is insufficient. If capture is unavailable, report visual verification as blocked.
- For research use the available search/browser tools; for images use an actually available image generator. For ideation requiring images, report the missing image generator before producing or claiming visual alternatives. Do not silently replace generated visuals with text. If subagents are unavailable, execute source parallel-work steps sequentially.
- Do not run the original user-context scripts or touch `$CODEX_HOME` or Codex personal state. Use the current task inputs by default. Save preferences only when explicitly requested, in a user-selected writable location; otherwise do not claim persistent memory.
- Sharing requires an available deployment tool and explicit publication authorization. Do not claim Sites/Vercel hosting or a public link from a local server. Preserve tool permission requests; never install or connect external services implicitly.
- This adapter is tested in TraeWork local tasks only after actual acceptance. Cloud runtime, image generation, Figma canvases and deployment require separate acceptance. Name a missing capability precisely; continue any independent supported work.

## Route to the source workflow

Read only the files needed for the task. Always keep the original evidence rules, selected-image gate, design QA and no-unrequested-publication constraints.

| Task | Read |
| --- | --- |
| Clarify a design brief before building | [get-context](source/skills/get-context/SKILL.md) |
| Research a product problem | [research](source/skills/research/SKILL.md) |
| Audit a product flow or screenshot | [audit](source/skills/audit/SKILL.md) |
| Explore visual alternatives | [ideate](source/skills/ideate/SKILL.md) |
| Build from a selected image | [image-to-code](source/skills/image-to-code/SKILL.md) |
| Recreate a supplied URL | [url-to-code](source/skills/url-to-code/SKILL.md) |
| Compare implementation with a design | [design-qa](source/skills/design-qa/SKILL.md) |
| Publish an explicitly requested prototype | [share](source/skills/share/SKILL.md) |
| Manage user-provided preferences | [user-context](source/skills/user-context/SKILL.md), with the host replacements above |

Read [communication](source/references/communication-protocol.md) and [source constraints](source/references/critical-overrides.md) when routed workflows reference them. Source runtime-specific instructions are replaced by the host adaptation above; task quality requirements still apply.

When delivering a result, briefly name the source workflow used, the output and verification performed, and any required tools that were unavailable. Never describe an untested route as validated.
