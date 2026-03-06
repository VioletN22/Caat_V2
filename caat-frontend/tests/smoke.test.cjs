// Basic smoke tests for the caat-frontend project.
// These are intentionally lightweight and framework-free so they can run with
// just Node.js. They verify that key files and folders exist and that a small
// utility behaves as expected.

const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectFile(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  assert(fs.existsSync(fullPath), `Expected file or directory to exist: ${relativePath}`);
}

function main() {
  // Structural checks: core Next.js app files/folders that should always exist.
  expectFile('tsconfig.json');
  expectFile('app');
  expectFile('app/layout.tsx');
  expectFile('app/page.tsx');

  // Light logic check: import the small "cn" helper and ensure it returns a string.
  // This imports compiled code via Next/TypeScript build tooling at runtime, so we
  // only assert that the module loads and function behaves in a minimal way.
  // If the import fails (e.g. due to TS/JS syntax errors), this test will fail.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { cn } = require('../lib/utils');
  const result = cn('a', false && 'b', 'c');
  assert(typeof result === 'string', 'Expected cn() to return a string');

  console.log('✅ caat-frontend smoke tests passed.');
}

try {
  main();
} catch (err) {
  console.error('❌ caat-frontend smoke tests failed:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}

