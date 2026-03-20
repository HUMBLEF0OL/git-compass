import { shouldExclude } from "./src/utils/file.js";

const tests = [
  { path: "package.json", expected: true },
  { path: "src/index.ts", expected: false },
  { path: "node_modules/foo/bar.js", expected: true },
  { path: "packages/core/package.json", expected: true },
  { path: "README.md", expected: true },
  { path: "src/components/App.tsx", expected: false },
];

let allPassed = true;
for (const test of tests) {
  const result = shouldExclude(test.path);
  const passed = result === test.expected;
  console.log(`${passed ? "✓" : "✗"} ${test.path}: ${result} (expected ${test.expected})`);
  if (!passed) allPassed = false;
}

if (allPassed) {
  console.log("\nAll tests passed!");
  process.exit(0);
} else {
  console.log("\nSome tests failed.");
  process.exit(1);
}
