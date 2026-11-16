// Finding 2-16: stream_iter.md
// Doc source: https://github.com/nodejs/node/blob/v24.22.3/doc/api/stream_iter.md#L864-L881
// Run: node 2-16.mjs   Needs a Node.js v24 release with node:stream/iter (v24.20.0 or later).
// Network: none. NOT RUN by the author: the installed v24.15.0 has no node:stream/iter, so the
// finding rests on the v24.22.3 source (lib/internal/streams/iter/duplex.js). On older versions
// the script only reports that the API is missing.
// Expected per source: the v24 example reads server.readable (the client's own data, which the
// echo loop is also consuming) instead of the echo; the corrected example from main reads
// client.readable and prints 'hello'. Each run has a 5 second timeout.
// v24 docs only: main is correct.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "duplex_v24_doc.mjs": "import { duplex, text } from 'node:stream/iter';\n\nconst [client, server] = duplex();\n\n// Server echoes back\nconst serving = (async () => {\n  for await (const chunks of server.readable) {\n    await server.writer.writev(chunks);\n  }\n})();\n\nawait client.writer.write('hello');\nawait client.writer.end();\n\nconsole.log(await text(server.readable)); // handled by echo\nawait serving;\n",
  "duplex_main.mjs": "import { duplex, text } from 'node:stream/iter';\n\nconst [client, server] = duplex();\n\n// Server echoes back\nconst serving = (async () => {\n  for await (const chunks of server.readable) {\n    await server.writer.writev(chunks);\n  }\n  await server.writer.end();\n})();\n\nawait client.writer.write('hello');\nawait client.writer.end();\n\nconsole.log(await text(client.readable)); // 'hello'\nawait serving;\n",
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

const probe = spawnSync(process.execPath, ['--experimental-stream-iter', '-e', "require('node:stream/iter')"], { encoding: 'utf8' });
if (probe.status !== 0) {
  show('node --experimental-stream-iter -e "require(\'node:stream/iter\')"', probe);
  console.log(`node:stream/iter is not available in ${process.version}; use v24.20.0 or later.`);
} else {
  node(['--experimental-stream-iter', 'duplex_v24_doc.mjs'], { timeout: 5000 });
  node(['--experimental-stream-iter', 'duplex_main.mjs'], { timeout: 5000 });
}
done();
