// Basic smoke tests for the my-app project.
// These are intentionally minimal and framework-free. They check that the core
// Next.js app structure exists so CI can catch obvious misconfigurations.

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
  // Structural checks: verify key Next.js app files/folders exist.
  expectFile('tsconfig.json');
  expectFile('app');
  expectFile('app/layout.tsx');
  expectFile('app/page.tsx');

  console.log('✅ my-app smoke tests passed.');
}

try {
  main();
} catch (err) {
  console.error('❌ my-app smoke tests failed:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}

