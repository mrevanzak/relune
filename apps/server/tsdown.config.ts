import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@relune\/.*/],
  // Keep pino external to avoid worker thread bundling issues
  external: ["pino", "pino-pretty", "@orpc/experimental-pino"],
});
