// Finding 1-7: esm.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/esm.md#L810-L816
// Run: node 1-7.mjs   (Node.js v24; checked on v24.15.0). Network: none.
// No WebAssembly text assembler is used: the script lists the $identifiers the documented .wat
// text declares and references. Expected wrong result: "export -> $get_length: UNBOUND" (exit 1).
// Control: the same module hand-encoded with the export pointing at $getLength; importing it
// prints 3, as the page describes.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "string-len.wat": "(module\n  ;; Compile-time import of the string length builtin.\n  (import \"wasm:js-string\" \"length\" (func $string_length (param externref) (result i32)))\n\n  ;; Define getLength, taking a JS value parameter assumed to be a string,\n  ;; calling string length on it and returning the result.\n  (func $getLength (param $str externref) (result i32)\n    local.get $str\n    call $string_length\n  )\n\n  ;; Export the getLength function.\n  (export \"getLength\" (func $get_length))\n)\n",
  "check_wat.js": "// Reads the documented .wat text (string-len.wat, copied verbatim from main esm.md\n// lines 804-817) and lists the $identifiers it declares and the ones it references\n// in (func $x) export descriptors and call instructions.\n'use strict';\nconst fs = require('node:fs');\nconst src = fs.readFileSync(__dirname + '/string-len.wat', 'utf8')\n  .split('\\n').map((l) => l.replace(/;;.*$/, '')).join('\\n');\nconst declared = new Set();\n// Export descriptors \"(export \"x\" (func $id))\" reference, not declare: drop them first.\nconst noExports = src.replace(/\\(export\\s+\"[^\"]+\"\\s+\\(func\\s+\\$[A-Za-z0-9_.]+\\)\\)/g, '');\nfor (const m of noExports.matchAll(/\\((?:func|param|local|global)\\s+(\\$[A-Za-z0-9_.]+)/g)) declared.add(m[1]);\nconst refs = [];\nfor (const m of src.matchAll(/\\(export\\s+\"[^\"]+\"\\s+\\(func\\s+(\\$[A-Za-z0-9_.]+)\\)\\)/g)) refs.push(['export', m[1]]);\nfor (const m of src.matchAll(/\\bcall\\s+(\\$[A-Za-z0-9_.]+)/g)) refs.push(['call', m[1]]);\nconsole.log('declared:', [...declared].join(' '));\nlet bad = 0;\nfor (const [kind, id] of refs) {\n  const ok = declared.has(id);\n  if (!ok) bad++;\n  console.log(`${kind} -> ${id}: ${ok ? 'bound' : 'UNBOUND'}`);\n}\nprocess.exitCode = bad ? 1 : 0;\n",
  "build_fixed_wasm.js": "// Hand-encodes the documented module WITH the export corrected to $getLength\n// (function index 1, after the one imported function) and writes string-len.wasm.\n'use strict';\nconst fs = require('node:fs');\nconst str = (s) => [s.length, ...Buffer.from(s, 'utf8')];\nconst section = (id, bytes) => [id, bytes.length, ...bytes];\nconst bytes = [\n  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,\n  // type 0: (externref) -> i32\n  ...section(1, [1, 0x60, 1, 0x6f, 1, 0x7f]),\n  // import \"wasm:js-string\" \"length\" (func type 0)\n  ...section(2, [1, ...str('wasm:js-string'), ...str('length'), 0x00, 0]),\n  // one defined function of type 0\n  ...section(3, [1, 0]),\n  // export \"getLength\" (func 1)\n  ...section(7, [1, ...str('getLength'), 0x00, 1]),\n  // body: no locals; local.get 0; call 0; end\n  ...section(10, [1, 6, 0, 0x20, 0, 0x10, 0, 0x0b]),\n];\nfs.writeFileSync(__dirname + '/string-len.wasm', Buffer.from(bytes));\nconsole.log('wrote', bytes.length, 'bytes');\n",
  "main.mjs": "import { getLength } from './string-len.wasm';\nconsole.log(getLength('foo')); // Returns 3.\n",
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

node(['check_wat.js']);
node(['build_fixed_wasm.js']);
node(['main.mjs']);
done();
