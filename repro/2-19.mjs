// Finding 2-19: tls.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/tls.md#L2370-L2385
// Run: node 2-19.mjs   Needs the openssl command-line tool on PATH (or set OPENSSL).
// Checked on Node.js v24.15.0 with OpenSSL 3.5.5. Network: localhost only (loopback-only.cjs
// pins the documented server.listen(8000) to 127.0.0.1).
// The openssl commands are the documented ones; -passout pass: is added so that the PKCS#12
// export does not prompt for a password. server.mjs and client.mjs are the documented examples.
// Expected wrong result: server section then client section -> the server fails with
// "error:0480006C:PEM routines::no start line"; client section then server section -> the
// client fails with the same error. Control: the two `openssl req` commands only -> both sides
// report "authorized" and the echo works.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "server.mjs": "import { createServer } from 'node:tls';\nimport { readFileSync } from 'node:fs';\n\nconst options = {\n  key: readFileSync('server-key.pem'),\n  cert: readFileSync('server-cert.pem'),\n\n  // This is necessary only if using client certificate authentication.\n  requestCert: true,\n\n  // This is necessary only if the client uses a self-signed certificate.\n  ca: [ readFileSync('client-cert.pem') ],\n};\n\nconst server = createServer(options, (socket) => {\n  console.log('server connected',\n              socket.authorized ? 'authorized' : 'unauthorized');\n  socket.write('welcome!\\n');\n  socket.setEncoding('utf8');\n  socket.pipe(socket);\n});\nserver.listen(8000, () => {\n  console.log('server bound');\n});\n",
  "client.mjs": "// Assumes an echo server that is listening on port 8000.\nimport { connect } from 'node:tls';\nimport { readFileSync } from 'node:fs';\nimport { stdin } from 'node:process';\n\nconst options = {\n  // Necessary only if the server requires client certificate authentication.\n  key: readFileSync('client-key.pem'),\n  cert: readFileSync('client-cert.pem'),\n\n  // Necessary only if the server uses a self-signed certificate.\n  ca: [ readFileSync('server-cert.pem') ],\n\n  // Necessary only if the server's cert isn't for \"localhost\".\n  checkServerIdentity: () => { return null; },\n};\n\nconst socket = connect(8000, options, () => {\n  console.log('client connected',\n              socket.authorized ? 'authorized' : 'unauthorized');\n  stdin.pipe(socket);\n  stdin.resume();\n});\nsocket.setEncoding('utf8');\nsocket.on('data', (data) => {\n  console.log(data);\n});\nsocket.on('end', () => {\n  console.log('server ends connection');\n});\n",
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

import { mkdirSync, copyFileSync } from 'node:fs';
const OPENSSL = process.env.OPENSSL || 'openssl';
const subj = '/CN=localhost';
const serverReq = ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-subj', subj, '-keyout', 'server-key.pem', '-out', 'server-cert.pem'];
const serverP12 = ['pkcs12', '-certpbe', 'AES-256-CBC', '-export', '-out', 'client-cert.pem', '-inkey', 'server-key.pem', '-in', 'server-cert.pem', '-passout', 'pass:'];
const clientReq = ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-subj', subj, '-keyout', 'client-key.pem', '-out', 'client-cert.pem'];
const clientP12 = ['pkcs12', '-certpbe', 'AES-256-CBC', '-export', '-out', 'server-cert.pem', '-inkey', 'client-key.pem', '-in', 'client-cert.pem', '-passout', 'pass:'];

async function scenario(name, commands) {
  const d = join(dir, name);
  mkdirSync(d);
  for (const f of Object.keys(FILES)) copyFileSync(join(dir, f), join(d, f));
  console.log(`\n=== ${name}`);
  for (const c of commands) {
    const r = spawnSync(OPENSSL, c, { cwd: d, encoding: 'utf8' });
    console.log(`openssl ${c.join(' ')} -> exit ${r.status}${r.error ? ' ' + r.error.code : ''}`);
  }
  const srv = spawn(process.execPath, ['-r', './loopback-only.cjs', 'server.mjs'], { cwd: d });
  let srvOut = '';
  srv.stdout.on('data', (x) => { srvOut += x; });
  srv.stderr.on('data', (x) => { srvOut += x; });
  await new Promise((r) => setTimeout(r, 1500));
  const cli = spawnSync(process.execPath, ['client.mjs'], { cwd: d, encoding: 'utf8', input: 'hi\n', timeout: 5000 });
  srv.kill();
  await new Promise((r) => setTimeout(r, 300));
  console.log('--- server output:\n' + srvOut.trim());
  console.log('--- client output (exit ' + cli.status + '):\n' + (cli.stdout + cli.stderr).trim());
}
await scenario('server_section_then_client_section', [serverReq, serverP12, clientReq, clientP12]);
await scenario('client_section_then_server_section', [clientReq, clientP12, serverReq, serverP12]);
await scenario('control_pem_pairs_only', [serverReq, clientReq]);
done();
