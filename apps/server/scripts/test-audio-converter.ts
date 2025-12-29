/* biome-ignore-all lint/suspicious/noConsole: Local dev script for manual audio conversion verification. */
/**
 * Manual test script for audio converter (no hardcoded paths).
 *
 * Usage:
 *   yarn tsx apps/server/scripts/test-audio-converter.ts <inputPath> [outputPath]
 *
 * Example:
 *   yarn tsx apps/server/scripts/test-audio-converter.ts "/path/to/input.opus" "/tmp/out.m4a"
 */

import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { convertToM4a, needsConversion } from "../src/shared/audio-converter";

function usage(): never {
  console.error(
    "Usage: yarn tsx apps/server/scripts/test-audio-converter.ts <inputPath> [outputPath]"
  );
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  const outputPath = args[1] ?? "/tmp/relune-test-output.m4a";

  if (!inputPath) usage();

  console.log("=== Audio Converter Test ===\n");
  console.log("Input:", inputPath);
  console.log("Output:", outputPath);

  const inputData = await readFile(inputPath);
  console.log("Input size:", inputData.length, "bytes");
  console.log("Needs conversion:", needsConversion(inputPath));

  console.log("\nConverting to m4a...");
  const startTime = Date.now();
  const result = await convertToM4a(
    new Uint8Array(inputData),
    basename(inputPath)
  );
  const elapsed = Date.now() - startTime;

  console.log("Output filename:", result.filename);
  console.log("Output size:", result.data.length, "bytes");
  console.log("Conversion time:", elapsed, "ms");

  await writeFile(outputPath, result.data);
  console.log("\nSaved to:", outputPath);

  // Verify with `file` if available
  try {
    const proc = spawn("file", [outputPath]);
    let output = "";
    for await (const chunk of proc.stdout) {
      output += chunk.toString();
    }
    await new Promise((resolve, reject) => {
      proc.on("close", (code) => (code === 0 ? resolve(code) : reject(code)));
    });
    console.log("\nVerifying output format...");
    console.log(output.trim());
  } catch (error) {
    console.log(
      "\nSkipping `file` verification (command not available or failed):",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  console.log("\n=== Test Complete ===");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
