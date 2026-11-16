// Finding 2-13: single-executable-applications.md
// Doc source: https://github.com/nodejs/node/blob/v24.22.3/doc/api/single-executable-applications.md#L58-L163
// Run: node 2-13.mjs   (Node.js v24 with --experimental-sea-config; checked on v24.15.0, Windows).
// Network: none. Follows steps 1-4 of the v24 single-executable tutorial (step 6, npx postject,
// is skipped because it needs the network; the failure is the file name and does not depend on
// injection), then step 8. The copy of the node binary is made in the temporary directory.
// Expected wrong result: the binary is created as hello / hello.exe, and running ./sea / sea.exe
// as step 8 says fails with ENOENT ("No such file or directory").
// v24 docs only: main uses one name throughout.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "hello.js": "console.log(`Hello, ${process.argv[2]}!`);\n",
  "sea-config.json": "{ \"main\": \"hello.js\", \"output\": \"sea-prep.blob\" }\n",
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

import { copyFileSync, readdirSync } from 'node:fs';
const win = process.platform === 'win32';
node(['--experimental-sea-config', 'sea-config.json']);
copyFileSync(process.execPath, join(dir, win ? 'hello.exe' : 'hello'));
console.log('\nfiles after steps 1-4:', readdirSync(dir).join(' '));
const sea = win ? 'sea.exe' : './sea';
show(`${sea} world   (step 8 as documented)`, spawnSync(join(dir, win ? 'sea.exe' : 'sea'), ['world'], { cwd: dir, encoding: 'utf8' }));
done();
