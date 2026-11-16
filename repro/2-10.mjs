// Finding 2-10: n-api.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L4565-L4590
// Run: node 2-10.mjs   Network: none.
// Not compiled by the author (no C compiler was available). The documented fragment is wrapped
// in a function so it can be compiled. If cc, gcc or clang is on PATH and the Node.js headers are
// found (NODE_INCLUDE env var, or <node prefix>/include/node), the script runs a syntax-only
// compile; expected: an unknown identifier napi_status_generic_failure and a missing `;`
// after the descriptor array. Otherwise it prints a static check of the same two points.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "example.c": "#include <node_api.h>\n\nnapi_status define_props(napi_env env) {\nnapi_status status = napi_status_generic_failure;\n\n// const obj = {};\nnapi_value obj;\nstatus = napi_create_object(env, &obj);\nif (status != napi_ok) return status;\n\n// Create napi_values for 123 and 456\nnapi_value fooValue, barValue;\nstatus = napi_create_int32(env, 123, &fooValue);\nif (status != napi_ok) return status;\nstatus = napi_create_int32(env, 456, &barValue);\nif (status != napi_ok) return status;\n\n// Set the properties\nnapi_property_descriptor descriptors[] = {\n  { \"foo\", NULL, NULL, NULL, NULL, fooValue, napi_writable | napi_configurable, NULL },\n  { \"bar\", NULL, NULL, NULL, NULL, barValue, napi_writable | napi_configurable, NULL }\n}\nstatus = napi_define_properties(env,\n                                obj,\n                                sizeof(descriptors) / sizeof(descriptors[0]),\n                                descriptors);\nif (status != napi_ok) return status;\n  return napi_ok;\n}\n",
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

import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
const inc = process.env.NODE_INCLUDE || join(dirname(dirname(process.execPath)), 'include', 'node');
const cc = ['cc', 'gcc', 'clang'].find((c) => !spawnSync(c, ['--version']).error);
if (cc && existsSync(join(inc, 'node_api.h'))) {
  show(`${cc} -fsyntax-only -I ${inc} example.c`,
       spawnSync(cc, ['-fsyntax-only', '-I', inc, 'example.c'], { cwd: dir, encoding: 'utf8' }));
  const hdr = readFileSync(join(inc, 'js_native_api_types.h'), 'utf8');
  console.log('napi_status_generic_failure in js_native_api_types.h:', hdr.includes('napi_status_generic_failure'));
  console.log('napi_generic_failure in js_native_api_types.h:', hdr.includes('napi_generic_failure'));
} else {
  console.log(`No C compiler or Node.js headers found (looked for headers in ${inc}); static check:`);
  const src = FILES['example.c'];
  console.log('uses napi_status_generic_failure (the enumerator is napi_generic_failure):',
              src.includes('napi_status_generic_failure'));
  const m = src.match(/descriptors\[\] = \{[\s\S]*?\n\}([^\n]*)/);
  console.log('rest of the line after the closing brace of descriptors[]:', JSON.stringify(m && m[1]), '(a `;` is required)');
  console.log('descriptors pass napi_enumerable:', /napi_enumerable/.test(src), '(the JavaScript sets enumerable: true)');
}
done();
