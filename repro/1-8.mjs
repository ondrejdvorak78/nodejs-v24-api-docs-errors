// Finding 1-8: deprecations.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/deprecations.md#L1158-L1160
// Run: node 1-8.mjs   (any Node.js version; checked on v24.15.0). Network: none.
// Expected wrong result: the documented expression gives false for new Date() and throws
// TypeError for {} and for a string; the Object.prototype.toString form gives true for new Date().
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "isdate.js": "'use strict';\n// Expression copied verbatim from doc/api/deprecations.md (main) line 1159.\nconst docCheck = (arg) =>\n  Date.prototype.toString.call(arg) === '[object Date]' && !isNaN(arg);\n// The presumably intended form, for comparison.\nconst objCheck = (arg) =>\n  Object.prototype.toString.call(arg) === '[object Date]' && !isNaN(arg);\n\nconst cases = {\n  'new Date()': new Date(),\n  \"new Date('invalid')\": new Date('invalid'),\n  '{}': {},\n  \"'2020-01-01'\": '2020-01-01',\n};\nfor (const [label, v] of Object.entries(cases)) {\n  let r;\n  try { r = docCheck(v); } catch (e) { r = `throws ${e.name}: ${e.message}`; }\n  console.log(`doc expression    ${label.padEnd(20)} -> ${r}`);\n  console.log(`Object.prototype  ${label.padEnd(20)} -> ${objCheck(v)}`);\n}\nconsole.log('Date.prototype.toString.call(new Date()) =',\n            JSON.stringify(Date.prototype.toString.call(new Date(0))));\n",
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

node(['isdate.js']);
done();
