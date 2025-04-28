// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const isCI = !!process.env.CI;

// If NOT in CI, also install the Electron version (only when needed locally)
if (!isCI) {
  run('npm rebuild better-sqlite3-darwin --build-from-source --runtime=darwin --arch=arm64 --target=35.2.1 --dist-url=https://electronjs.org/headers');
}
