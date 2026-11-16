// Finding 2-15: stream.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/stream.md#L1623-L1639
// Run: node 2-15.mjs   (any Node.js version; checked on v24.15.0). Network: none.
// whole_file.js writes a UTF-8 file whose 3-byte character straddles the 64 KiB chunk boundary
// and reads it with the documented pattern, unchanged.
// Expected wrong result: "equal to file contents: false" and "U+FFFD count: 3";
// Buffer.concat(chunks).toString("utf8") gives the original text.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "whole_file.js": "'use strict';\n// Builds a UTF-8 file in this folder whose 3-byte character straddles the\n// 64 KiB chunk boundary of fs.createReadStream(), then reads it back with the\n// pattern from doc/api/stream.md (main) lines 1627-1638, unchanged except that\n// `readable` is the file stream and the result is printed.\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst file = path.join(__dirname, 'text.txt');\nconst original = 'a'.repeat(65535) + '\u20ac' + ' and more text \u00e9\u00e8 \u65e5\u672c\u8a9e\\n';\nfs.writeFileSync(file, original, 'utf8');\n\nconst readable = fs.createReadStream(file);\n\n// --- documented pattern (main stream.md 1627-1638) ---\nconst chunks = [];\n\nreadable.on('readable', () => {\n  let chunk;\n  while (null !== (chunk = readable.read())) {\n    chunks.push(chunk);\n  }\n});\n\nreadable.on('end', () => {\n  const content = chunks.join('');\n// --- end of documented pattern; checks below ---\n  console.log('chunks:', chunks.length, chunks.map((c) => c.length).join(' + '), 'bytes');\n  console.log('equal to file contents:', content === original);\n  console.log('U+FFFD count:', (content.match(/\ufffd/g) || []).length);\n  console.log('around boundary:', JSON.stringify(content.slice(65533, 65545)));\n  const fixed = Buffer.concat(chunks).toString('utf8');\n  console.log('Buffer.concat(chunks).toString(\"utf8\") equal:', fixed === original);\n});\n",
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

node(['whole_file.js']);
done();
