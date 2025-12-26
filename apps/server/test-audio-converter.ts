/**
 * Test script for audio converter
 * Run with: bun apps/server/test-audio-converter.ts
 */

import { readFile, writeFile } from "node:fs/promises";
import { convertToM4a, needsConversion } from "./src/shared/audio-converter";

const INPUT_FILE =
	"/Users/rev/relune/WhatsApp Chat - Home/00000002-AUDIO-2025-12-25-16-05-29.opus";
const OUTPUT_FILE = "/tmp/relune-test-output.m4a";

async function main() {
	console.log("=== Audio Converter Test ===\n");

	// Load input file
	console.log("Loading:", INPUT_FILE);
	const inputData = await readFile(INPUT_FILE);
	console.log("Input size:", inputData.length, "bytes");
	console.log("Needs conversion:", needsConversion(INPUT_FILE));

	// Convert
	console.log("\nConverting to m4a...");
	const startTime = Date.now();
	const result = await convertToM4a(new Uint8Array(inputData), "test.opus");
	const elapsed = Date.now() - startTime;

	console.log("Output filename:", result.filename);
	console.log("Output size:", result.data.length, "bytes");
	console.log("Conversion time:", elapsed, "ms");

	// Save output
	await writeFile(OUTPUT_FILE, result.data);
	console.log("\nSaved to:", OUTPUT_FILE);

	// Verify with file command
	console.log("\nVerifying output format...");
	const proc = Bun.spawn(["file", OUTPUT_FILE], { stdout: "pipe" });
	const output = await new Response(proc.stdout).text();
	console.log(output.trim());

	console.log("\n=== Test Complete ===");
	console.log("Play the file to verify audio quality:");
	console.log(`  open ${OUTPUT_FILE}`);
}

main().catch((err) => {
	console.error("Test failed:", err);
	process.exit(1);
});
