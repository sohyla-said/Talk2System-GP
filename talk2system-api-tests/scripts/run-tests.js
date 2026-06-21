const { spawnSync } = require('child_process');
const path = require('path');
const { pathToFileURL } = require('url');

// jest-html-reporter's own "Report generated" log is silenced by --runInBand
// (it sets process.env.JEST_WORKER_ID, which the reporter treats as "running
// inside a worker, stay quiet"), so the report path is announced here instead.
const result = spawnSync('npx', ['jest', '--runInBand', '--verbose', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
});

const reportPath = path.resolve(__dirname, '..', 'reports', 'test-report.html');
console.log(`\nHTML report: ${reportPath}`);
console.log(`Open in browser: ${pathToFileURL(reportPath).href}`);

process.exit(result.status === null ? 1 : result.status);
