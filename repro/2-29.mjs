// Finding 2-29: test.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/test.md#L3389-L3419
// Run: node 2-29.mjs   (Node.js v24; checked on v24.15.0). Network: none.
// interval.test.mjs is the documented test; interval_fixed.test.mjs asserts the yielded values
// as they are.
// Expected wrong result: "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal"
// with actual = startedAt and expected = startedAt + 1000 (exit 1). The control passes.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "interval.test.mjs": "import assert from 'node:assert';\nimport { test } from 'node:test';\nimport nodeTimersPromises from 'node:timers/promises';\ntest('should tick five times testing a real use case', async (context) => {\n  context.mock.timers.enable({ apis: ['setInterval'] });\n\n  const expectedIterations = 3;\n  const interval = 1000;\n  const startedAt = Date.now();\n  async function run() {\n    const times = [];\n    for await (const time of nodeTimersPromises.setInterval(interval, startedAt)) {\n      times.push(time);\n      if (times.length === expectedIterations) break;\n    }\n    return times;\n  }\n\n  const r = run();\n  context.mock.timers.tick(interval);\n  context.mock.timers.tick(interval);\n  context.mock.timers.tick(interval);\n\n  const timeResults = await r;\n  assert.strictEqual(timeResults.length, expectedIterations);\n  for (let it = 1; it < expectedIterations; it++) {\n    assert.strictEqual(timeResults[it - 1], startedAt + (interval * it));\n  }\n});\n",
  "interval_fixed.test.mjs": "import assert from 'node:assert';\nimport { test } from 'node:test';\nimport nodeTimersPromises from 'node:timers/promises';\ntest('should tick three times testing a real use case', async (context) => {\n  context.mock.timers.enable({ apis: ['setInterval'] });\n\n  const expectedIterations = 3;\n  const interval = 1000;\n  const startedAt = Date.now();\n  async function run() {\n    const times = [];\n    for await (const time of nodeTimersPromises.setInterval(interval, startedAt)) {\n      times.push(time);\n      if (times.length === expectedIterations) break;\n    }\n    return times;\n  }\n\n  const r = run();\n  context.mock.timers.tick(interval);\n  context.mock.timers.tick(interval);\n  context.mock.timers.tick(interval);\n\n  const timeResults = await r;\n  assert.strictEqual(timeResults.length, expectedIterations);\n  // setInterval() yields the value it was given on every tick.\n  assert.deepStrictEqual(timeResults, [startedAt, startedAt, startedAt]);\n});\n",
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

node(['--test', 'interval.test.mjs']);
node(['--test', 'interval_fixed.test.mjs']);
done();
