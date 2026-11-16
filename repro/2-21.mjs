// Finding 2-21: webcrypto.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/webcrypto.md#L2449-L2455
// Run: node 2-21.mjs   (Node.js v24 with KMAC in Web Crypto; checked on v24.15.0). Network: none.
// Expected wrong result: the documented member set { algorithm: "KMAC128", outputLength: 256 }
// throws "TypeError: ... 'name' is required in 'Algorithm'"; { name: "KMAC128", ... } signs
// (32 bytes) and verifies (true).
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "kmac.mjs": "// KmacParams as documented in doc/api/webcrypto.md (main) lines 2437-2476:\n// members `algorithm`, `outputLength`, `customization`.\nconst { subtle } = globalThis.crypto;\nconst data = new TextEncoder().encode('hello');\nconst key = await subtle.generateKey({ name: 'KMAC128' }, false, ['sign', 'verify']);\nconsole.log('generateKey({ name: \"KMAC128\" }) ->', key.algorithm);\n\nconst variants = {\n  'documented { algorithm: \"KMAC128\", outputLength: 256 }': { algorithm: 'KMAC128', outputLength: 256 },\n  '{ name: \"KMAC128\", outputLength: 256 }': { name: 'KMAC128', outputLength: 256 },\n};\nfor (const [label, params] of Object.entries(variants)) {\n  try {\n    const sig = await subtle.sign(params, key, data);\n    const ok = await subtle.verify(params, key, sig, data);\n    console.log(`sign/verify ${label}: ${sig.byteLength} bytes, verify=${ok}`);\n  } catch (e) {\n    console.log(`sign/verify ${label}: ${e.name}: ${e.message}`);\n  }\n}\n",
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

node(['kmac.mjs']);
done();
