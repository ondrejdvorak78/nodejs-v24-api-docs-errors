// Finding 2-12: repl.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/repl.md#L1027-L1031
// Run: node 2-12.mjs   (Node.js v24; checked on v24.15.0).
// Network: localhost only. The documented server calls listen(1337); loopback-only.cjs (loaded
// with --require) pins it to 127.0.0.1. The client stdin is a pipe here, so tty-shim.mjs adds a
// no-op setRawMode; the documented client is otherwise unchanged.
// Expected wrong result: after ".exit", the client fails with
// "ReferenceError: done is not defined" (exit 1).
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "repl-server.js": "// repl-server.js\nconst repl = require('node:repl');\nconst net = require('node:net');\n\nnet\n  .createServer((socket) => {\n    const r = repl.start({\n      prompt: `socket ${socket.remoteAddress}:${socket.remotePort}> `,\n      input: socket,\n      output: socket,\n      terminal: true,\n      useGlobal: false,\n    });\n    r.on('exit', () => {\n      socket.end();\n    });\n    r.context.socket = socket;\n  })\n  .listen(1337);\n",
  "repl-client.js": "// repl-client.js\nimport net from 'node:net';\nimport process from 'node:process';\n\nconst sock = net.connect(1337);\n\nprocess.stdin.pipe(sock);\nsock.pipe(process.stdout);\n\nsock.on('connect', () => {\n  process.stdin.resume();\n  process.stdin.setRawMode(true);\n});\n\nsock.on('close', () => {\n  process.stdin.setRawMode(false);\n  process.stdin.pause();\n  sock.removeListener('close', done);\n});\n\nprocess.stdin.on('end', () => {\n  sock.destroy();\n  console.log();\n});\n\nprocess.stdin.on('data', (b) => {\n  if (b.length === 1 && b[0] === 4) {\n    process.stdin.emit('end');\n  }\n});\n",
  "tty-shim.mjs": "// Test harness only: stdin here is a pipe, not a TTY, so setRawMode does not exist.\n// Provide a no-op so the documented client can run unchanged.\nimport process from 'node:process';\nif (typeof process.stdin.setRawMode !== 'function') {\n  process.stdin.setRawMode = function setRawMode() { return this; };\n}\n",
  "loopback-only.cjs": "// Test harness only: force every server.listen(port, cb) onto 127.0.0.1 so the\n// documented examples never listen on other interfaces. Loaded with --require.\n'use strict';\nconst net = require('node:net');\nconst listen = net.Server.prototype.listen;\nnet.Server.prototype.listen = function (...args) {\n  if (typeof args[0] === 'number') {\n    const port = args[0];\n    const cb = args.find((a) => typeof a === 'function');\n    return listen.call(this, { port, host: '127.0.0.1' }, cb);\n  }\n  return listen.apply(this, args);\n};\n",
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

const server = bg(process.execPath, ['-r', './loopback-only.cjs', 'repl-server.js'], null);
await new Promise((r) => setTimeout(r, 1500));
node(['--import', './tty-shim.mjs', 'repl-client.js'], { input: '.exit\n', timeout: 10000 });
server.child.kill();
done();
