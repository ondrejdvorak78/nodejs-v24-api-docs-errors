// Finding 1-9: cli.md
// Doc source: https://github.com/nodejs/node/blob/main/doc/api/cli.md#L858-L875
// Run: node 1-9.mjs   (Node.js v24 with --experimental-config-file; checked on v24.15.0).
// Network: none. On main the flag is now --config-file (the experimental name stays an alias).
// Expected wrong result: "Option --watch-preserve-output is already defined" and
// "node.config.json: invalid content", exit 9.
// Control: the same file without the "watch" namespace parses; Node.js then enters watch mode
// and stops on the missing ./src directory, which is past config parsing.
// The embedded example text is copied from the Node.js documentation (doc/api), which is
// MIT-licensed (Copyright Node.js contributors). The harness code in this file is MIT.
// Fixtures are written to a fresh temporary directory, which is removed at the end.
const FILES = {
  "node.config.json": "{\n  \"$schema\": \"https://nodejs.org/dist/vX.Y.Z/docs/node-config-schema.json\",\n  \"nodeOptions\": {\n    \"import\": [\n      \"amaro/strip\"\n    ],\n    \"watch-path\": \"src\",\n    \"watch-preserve-output\": true\n  },\n  \"test\": {\n    \"test-isolation\": \"process\"\n  },\n  \"watch\": {\n    \"watch-preserve-output\": true\n  }\n}\n",
  "node.config.nodup.json": "{\n  \"$schema\": \"https://nodejs.org/dist/vX.Y.Z/docs/node-config-schema.json\",\n  \"nodeOptions\": {\n    \"import\": [\n      \"amaro/strip\"\n    ],\n    \"watch-path\": \"src\",\n    \"watch-preserve-output\": true\n  },\n  \"test\": {\n    \"test-isolation\": \"process\"\n  }\n}",
  "app.js": "console.log('app ran');\n",
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

node(['--experimental-config-file=node.config.json', 'app.js']);
node(['--experimental-config-file=node.config.nodup.json', 'app.js'], { timeout: 8000 });
done();
