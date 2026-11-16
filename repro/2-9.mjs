// Finding 2-9: n-api.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L2140-L2151
// Run: node 2-9.mjs   Network: none.
// Not compiled by the author (no C compiler was available). If cc, gcc or clang is on PATH and
// the Node.js headers are found (NODE_INCLUDE env var, or <node prefix>/include/node), the script
// runs a syntax-only compile; expected: an error that `status` is undeclared.
// Otherwise it prints a static check: `status` is used but only `result` is declared.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "example.c": "#include <node_api.h>\n\nNAPI_MODULE_INIT(/* napi_env env, napi_value exports */) {\n  napi_value answer;\n  napi_status result;\n\n  status = napi_create_int64(env, 42, &answer);\n  if (status != napi_ok) return NULL;\n\n  status = napi_set_named_property(env, exports, \"answer\", answer);\n  if (status != napi_ok) return NULL;\n\n  return exports;\n}\n",
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

import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
const inc = process.env.NODE_INCLUDE || join(dirname(dirname(process.execPath)), 'include', 'node');
const cc = ['cc', 'gcc', 'clang'].find((c) => !spawnSync(c, ['--version']).error);
if (cc && existsSync(join(inc, 'node_api.h'))) {
  show(`${cc} -fsyntax-only -I ${inc} example.c`,
       spawnSync(cc, ['-fsyntax-only', '-I', inc, 'example.c'], { cwd: dir, encoding: 'utf8' }));
} else {
  console.log(`No C compiler or Node.js headers found (looked for headers in ${inc}); static check:`);
  const src = FILES['example.c'];
  console.log('declared napi_status variables:', [...src.matchAll(/napi_status\s+(\w+)\s*;/g)].map((m) => m[1]));
  console.log('uses of `status`:', (src.match(/\bstatus\b/g) || []).length);
  console.log('NAPI_MODULE_INIT() supplies only env and exports (src/node_api.h), so `status` is undeclared.');
}
done();
