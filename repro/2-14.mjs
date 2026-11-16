// Finding 2-14: stream.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/stream.md#L2297-L2300
// Run: node 2-14.mjs   (Node.js v24; checked on v24.15.0).
// Network: localhost only. dns-stub-server.js answers every A query on 127.0.0.1:53535 with
// two records (TTL 300); use-local-dns.mjs (loaded with --import) points each Resolver at it.
// The documented examples are unchanged.
// Expected wrong result: filter.mjs prints 3 and 4, then
// "TypeError: Cannot read properties of undefined (reading 'ttl')" (exit 1);
// foreach.mjs prints undefined three times; toarray.mjs prints [ undefined, undefined, undefined ].
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "dns-stub-server.js": "// Minimal local DNS responder on 127.0.0.1:53535 (UDP). Answers every A query\n// with two A records (127.0.0.1 and 127.0.0.2), TTL 300. Test harness only.\n'use strict';\nconst dgram = require('node:dgram');\nconst sock = dgram.createSocket('udp4');\n\nsock.on('message', (msg, rinfo) => {\n  // Question section starts at byte 12; walk the QNAME labels.\n  let off = 12;\n  while (msg[off] !== 0) off += msg[off] + 1;\n  off += 1; // zero byte\n  const qEnd = off + 4; // QTYPE + QCLASS\n  const question = msg.subarray(12, qEnd);\n  const header = Buffer.alloc(12);\n  msg.copy(header, 0, 0, 2); // ID\n  header.writeUInt16BE(0x8180, 2); // response, RD, RA, NOERROR\n  header.writeUInt16BE(1, 4); // QDCOUNT\n  header.writeUInt16BE(2, 6); // ANCOUNT\n  const answer = (last) => {\n    const a = Buffer.alloc(16);\n    a.writeUInt16BE(0xc00c, 0); // pointer to QNAME\n    a.writeUInt16BE(1, 2); // TYPE A\n    a.writeUInt16BE(1, 4); // CLASS IN\n    a.writeUInt32BE(300, 6); // TTL\n    a.writeUInt16BE(4, 10); // RDLENGTH\n    a[12] = 127; a[13] = 0; a[14] = 0; a[15] = last;\n    return a;\n  };\n  sock.send(Buffer.concat([header, question, answer(1), answer(2)]), rinfo.port, rinfo.address);\n});\nsock.bind(53535, '127.0.0.1', () => console.error('dns stub listening on 127.0.0.1:53535'));\n",
  "use-local-dns.mjs": "// Test harness only: make every node:dns/promises Resolver query the local stub\n// on 127.0.0.1:53535 instead of the network. The documented example is unchanged.\nimport { Resolver } from 'node:dns/promises';\nconst original = Resolver.prototype.resolve4;\nResolver.prototype.resolve4 = function resolve4(...args) {\n  if (!this.__local) { this.setServers(['127.0.0.1:53535']); this.__local = true; }\n  return original.apply(this, args);\n};\n",
  "filter.mjs": "import { Readable } from 'node:stream';\nimport { Resolver } from 'node:dns/promises';\n\n// With a synchronous predicate.\nfor await (const chunk of Readable.from([1, 2, 3, 4]).filter((x) => x > 2)) {\n  console.log(chunk); // 3, 4\n}\n// With an asynchronous predicate, making at most 2 queries at a time.\nconst resolver = new Resolver();\nconst dnsResults = Readable.from([\n  'nodejs.org',\n  'openjsf.org',\n  'www.linuxfoundation.org',\n]).filter(async (domain) => {\n  const { address } = await resolver.resolve4(domain, { ttl: true });\n  return address.ttl > 60;\n}, { concurrency: 2 });\nfor await (const result of dnsResults) {\n  // Logs domains with more than 60 seconds on the resolved dns record.\n  console.log(result);\n}\n",
  "foreach.mjs": "import { Readable } from 'node:stream';\nimport { Resolver } from 'node:dns/promises';\n\n// With a synchronous predicate.\nfor await (const chunk of Readable.from([1, 2, 3, 4]).filter((x) => x > 2)) {\n  console.log(chunk); // 3, 4\n}\n// With an asynchronous predicate, making at most 2 queries at a time.\nconst resolver = new Resolver();\nconst dnsResults = Readable.from([\n  'nodejs.org',\n  'openjsf.org',\n  'www.linuxfoundation.org',\n]).map(async (domain) => {\n  const { address } = await resolver.resolve4(domain, { ttl: true });\n  return address;\n}, { concurrency: 2 });\nawait dnsResults.forEach((result) => {\n  // Logs result, similar to `for await (const result of dnsResults)`\n  console.log(result);\n});\nconsole.log('done'); // Stream has finished\n",
  "toarray.mjs": "import { Readable } from 'node:stream';\nimport { Resolver } from 'node:dns/promises';\n\nawait Readable.from([1, 2, 3, 4]).toArray(); // [1, 2, 3, 4]\n\nconst resolver = new Resolver();\n\n// Make dns queries concurrently using .map and collect\n// the results into an array using toArray\nconst dnsResults = await Readable.from([\n  'nodejs.org',\n  'openjsf.org',\n  'www.linuxfoundation.org',\n]).map(async (domain) => {\n  const { address } = await resolver.resolve4(domain, { ttl: true });\n  return address;\n}, { concurrency: 2 }).toArray();\nconsole.log(dnsResults);\n",
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

const stub = bg(process.execPath, ['dns-stub-server.js'], 'listening');
await stub.ready;
for (const f of ['filter.mjs', 'foreach.mjs', 'toarray.mjs']) node(['--import', './use-local-dns.mjs', f]);
stub.child.kill();
done();
