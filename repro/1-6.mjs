// Finding 1-6: module.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/module.md#L1141-L1144
// Run: node 1-6.mjs   (Node.js v24; checked on v24.15.0). Network: none.
// Expected wrong result: TypeError: fs.readFileSync is not a function (exit 1),
// instead of the documented output "some module!".
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "import-map-sync-hooks.js": "// import-map-sync-hooks.js\nimport fs from 'node:fs/promises';\nimport module from 'node:module';\n\nconst { imports } = JSON.parse(fs.readFileSync('import-map.json', 'utf-8'));\n\nfunction resolve(specifier, context, nextResolve) {\n  if (Object.hasOwn(imports, specifier)) {\n    return nextResolve(imports[specifier], context);\n  }\n\n  return nextResolve(specifier, context);\n}\n\nmodule.registerHooks({ resolve });\n",
  "import-map.json": "{\n  \"imports\": {\n    \"a-module\": \"./some-module.js\"\n  }\n}\n",
  "main.js": "// main.js\nimport 'a-module';\n",
  "some-module.js": "// some-module.js\nconsole.log('some module!');\n",
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

node(['--import', './import-map-sync-hooks.js', 'main.js']);
done();
