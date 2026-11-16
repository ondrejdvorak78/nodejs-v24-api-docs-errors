// Finding 1-5: module.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/module.md#L1003-L1006
// Run: node 1-5.mjs   (Node.js v24; checked on v24.15.0). Network: none.
// Expected wrong result: the documented load hook prints "word = foo" (the rewrite is lost, exit 0).
// Control: the same hook with `...result` spread first prints "word = bar".
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "hooks.mjs": "import { registerHooks } from 'node:module';\nimport { Buffer } from 'node:buffer';\n\nfunction load(url, context, nextLoad) {\n  // The hook can skip default loading and provide a custom source code.\n  if (url === 'special-module') {\n    return {\n      source: 'export const special = 42;',\n      format: 'module',\n      shortCircuit: true,  // This is mandatory if nextLoad() is not called.\n    };\n  }\n\n  // It's possible to modify the source code loaded by the next - possibly default - step,\n  // for example, replacing 'foo' with 'bar' in the source code of the module.\n  const result = nextLoad(url, context);\n  const source = typeof result.source === 'string' ?\n    result.source : Buffer.from(result.source).toString('utf8');\n  return {\n    source: source.replace(/foo/g, 'bar'),\n    ...result,\n  };\n}\n\nregisterHooks({ load });\n",
  "hooks_fixed.mjs": "import { registerHooks } from 'node:module';\nimport { Buffer } from 'node:buffer';\n\nfunction load(url, context, nextLoad) {\n  // The hook can skip default loading and provide a custom source code.\n  if (url === 'special-module') {\n    return {\n      source: 'export const special = 42;',\n      format: 'module',\n      shortCircuit: true,  // This is mandatory if nextLoad() is not called.\n    };\n  }\n\n  // It's possible to modify the source code loaded by the next - possibly default - step,\n  // for example, replacing 'foo' with 'bar' in the source code of the module.\n  const result = nextLoad(url, context);\n  const source = typeof result.source === 'string' ?\n    result.source : Buffer.from(result.source).toString('utf8');\n  return {\n    ...result,\n    source: source.replace(/foo/g, 'bar'),\n  };\n}\n\nregisterHooks({ load });\n",
  "main.mjs": "export const word = 'foo';\nconsole.log('word =', word);\n",
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

node(['--import', './hooks.mjs', 'main.mjs']);
node(['--import', './hooks_fixed.mjs', 'main.mjs']);
done();
