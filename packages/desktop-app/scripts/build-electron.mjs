import { build } from "esbuild";

await Promise.all([
  build({
    entryPoints: ["electron/main.ts"],
    outfile: "build/main.cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron", "tar", "yaml"],
  }),
  build({
    entryPoints: ["electron/preload.ts"],
    outfile: "build/preload.cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron"],
  }),
  build({
    entryPoints: ["electron/operations.ts"],
    outfile: "build/operations.cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["tar", "yaml"],
  }),
]);
