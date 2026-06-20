import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const generatedDir = join(rootDir, "test", "generated");

function parsePositiveIntegerFlag(name, fallback) {
  const argIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  const rawValue =
    argIndex === -1 ? undefined : process.argv[argIndex + 1];
  const value = rawValue === undefined ? fallback : Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }

  return value;
}

function testFileContents(fileNumber, testNumbers) {
  const tests = testNumbers
    .map(
      (testNumber) => `test("generated test ${testNumber}", async () => {
  await sleep(randomDelayMs());
  expect(true).toBe(true);
});`
    )
    .join("\n\n");

  return `import { describe, expect, test } from "vitest";

function randomDelayMs() {
  return Math.floor(Math.random() * 51);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("generated file ${fileNumber}", () => {
${tests
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
});
`;
}

async function main() {
  const testCount = parsePositiveIntegerFlag("tests", 25);
  const fileCount = parsePositiveIntegerFlag("files", 5);

  if (fileCount > testCount) {
    throw new Error("--files must be less than or equal to --tests");
  }

  const testsByFile = Array.from({ length: fileCount }, () => []);

  for (let testNumber = 1; testNumber <= testCount; testNumber += 1) {
    testsByFile[(testNumber - 1) % fileCount].push(testNumber);
  }

  await rm(generatedDir, { force: true, recursive: true });
  await mkdir(generatedDir, { recursive: true });

  await Promise.all(
    testsByFile.map((testNumbers, index) =>
      writeFile(
        join(generatedDir, `generated-${index + 1}.test.js`),
        testFileContents(index + 1, testNumbers)
      )
    )
  );

  console.log(
    `Generated ${testCount} tests across ${fileCount} files in ${generatedDir}`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
