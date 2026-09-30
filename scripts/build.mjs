import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { context } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const outdir = resolve(root, "dist");
const watch = process.argv.includes("--watch");

await mkdir(outdir, { recursive: true });
await copyFile(resolve(root, "manifest.json"), resolve(outdir, "manifest.json"));

const targets = [
  { entry: "src/content/main.ts", output: "content", format: "iife" },
  { entry: "src/background/main.ts", output: "background", format: "esm" },
];

const contexts = await Promise.all(
  targets.map(({ entry, output, format }) =>
    context({
      absWorkingDir: root,
      entryPoints: [entry],
      outfile: resolve(outdir, `${output}.js`),
      bundle: true,
      format,
      platform: "browser",
      target: "chrome120",
      sourcemap: true,
      logLevel: "info",
    }),
  ),
);

if (watch) {
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log(`Watching TypeScript. Load this directory in Chrome: ${outdir}`);
} else {
  try {
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    console.log(`Built extension: ${outdir}`);
  } finally {
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
  }
}
