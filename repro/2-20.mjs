// Finding 2-20: test.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/test.md#L1507-L1553
// Run: node 2-20.mjs   (Node.js v24; checked on v24.15.0). Network: none.
// reporter.mjs is the documented stream.Transform reporter; reporter_default.mjs is the same
// file with `default: callback();` added.
// Expected wrong result: with three passing tests the output stops after "test c enqueued"
// (no started / passed lines, exit 0); with a failing test no "failed" line appears (exit 1).
// Control: reporter_default.mjs prints the started, passed and plan lines for all three tests.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "reporter.mjs": "import { Transform } from 'node:stream';\n\nconst customReporter = new Transform({\n  writableObjectMode: true,\n  transform(event, encoding, callback) {\n    switch (event.type) {\n      case 'test:dequeue':\n        callback(null, `test ${event.data.name} dequeued`);\n        break;\n      case 'test:enqueue':\n        callback(null, `test ${event.data.name} enqueued`);\n        break;\n      case 'test:watch:drained':\n        callback(null, 'test watch queue drained');\n        break;\n      case 'test:watch:restarted':\n        callback(null, 'test watch restarted due to file change');\n        break;\n      case 'test:start':\n        callback(null, `test ${event.data.name} started`);\n        break;\n      case 'test:pass':\n        callback(null, `test ${event.data.name} passed`);\n        break;\n      case 'test:fail':\n        callback(null, `test ${event.data.name} failed`);\n        break;\n      case 'test:plan':\n        callback(null, 'test plan');\n        break;\n      case 'test:diagnostic':\n      case 'test:stderr':\n      case 'test:stdout':\n        callback(null, event.data.message);\n        break;\n      case 'test:coverage': {\n        const { totalLineCount } = event.data.summary.totals;\n        callback(null, `total line count: ${totalLineCount}\\n`);\n        break;\n      }\n    }\n  },\n});\n\nexport default customReporter;\n",
  "reporter_default.mjs": "import { Transform } from 'node:stream';\n\nconst customReporter = new Transform({\n  writableObjectMode: true,\n  transform(event, encoding, callback) {\n    switch (event.type) {\n      case 'test:dequeue':\n        callback(null, `test ${event.data.name} dequeued`);\n        break;\n      case 'test:enqueue':\n        callback(null, `test ${event.data.name} enqueued`);\n        break;\n      case 'test:watch:drained':\n        callback(null, 'test watch queue drained');\n        break;\n      case 'test:watch:restarted':\n        callback(null, 'test watch restarted due to file change');\n        break;\n      case 'test:start':\n        callback(null, `test ${event.data.name} started`);\n        break;\n      case 'test:pass':\n        callback(null, `test ${event.data.name} passed`);\n        break;\n      case 'test:fail':\n        callback(null, `test ${event.data.name} failed`);\n        break;\n      case 'test:plan':\n        callback(null, 'test plan');\n        break;\n      case 'test:diagnostic':\n      case 'test:stderr':\n      case 'test:stdout':\n        callback(null, event.data.message);\n        break;\n      case 'test:coverage': {\n        const { totalLineCount } = event.data.summary.totals;\n        callback(null, `total line count: ${totalLineCount}\\n`);\n        break;\n      }\n      default:\n        callback();\n    }\n  },\n});\n\nexport default customReporter;\n",
  "sample.test.mjs": "import { test } from 'node:test';\ntest('a', () => {});\ntest('b', () => {});\ntest('c', () => {});\n",
  "failing.test.mjs": "import { test } from \"node:test\";\ntest(\"a\", () => { throw new Error(\"boom\"); });\n",
};

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'nodejs-doc-repro-'));
for (const [name, text] of Object.entries(FILES)) writeFileSync(join(dir, name), text);

function show(label, r) {
  console.log(`\n$ ${label}`);
  if (r.error) console.log(`(spawn error: ${r.error.code || r.error.message})`);
  if (r.stdout) process.stdout.write(String(r.stdout));
  if (r.stderr) process.stdout.write(String(r.stderr));
  console.log(`(exit ${r.status})`);
  return r;
}
function node(args, opts = {}) {
  const r = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8', timeout: 20000, ...opts });
  return show(`node ${args.join(' ')}`, r);
}
function bg(cmd, args, readyText) {
  const child = spawn(cmd, args, { cwd: dir });
  let out = '';
  const ready = new Promise((resolve) => {
    const on = (d) => { out += d; if (!readyText || out.includes(readyText)) resolve(); };
    child.stdout.on('data', on);
    child.stderr.on('data', on);
    child.on('exit', () => resolve());
    setTimeout(resolve, 3000);
  });
  return { child, ready, output: () => out };
}
function done() {
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}

node(['--test', '--test-reporter=./reporter.mjs', 'sample.test.mjs']);
node(['--test', '--test-reporter=./reporter.mjs', 'failing.test.mjs']);
node(['--test', '--test-reporter=./reporter_default.mjs', 'sample.test.mjs']);
done();
