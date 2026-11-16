Title: doc: errors in the v24 API reference (audited v24.22.1, re-checked against v24.22.3)

---

The items below are documentation errors in the v24 API reference that came out of an audit of the v24.22.1 docs; each was re-checked on 16 November 2026 against v24.22.3 and `main`, and all of them are still in the v24.22.3 docs. Each section gives the page, the current text, what happens (run on Node.js v24.15.0 unless it says it was checked against the source) and a suggested change. Each item can be checked against the current documentation; what matters is whether it is correct and whether it is fixed, not who found it or how.

### cli.md: the configuration-file example sets `watch-preserve-output` twice

Page: https://nodejs.org/docs/latest-v24.x/api/cli.html#--experimental-config-fileconfig
Source (main): https://github.com/nodejs/node/blob/main/doc/api/cli.md#L858-L875

On main the section is now `--config-file` (the flag was renamed; `--experimental-config-file` remains an alias). The example and the duplicate check are unchanged there.

Current text (main, `doc/api/cli.md` lines 861-873, 980):

~~~text
  "nodeOptions": {
...
    "watch-preserve-output": true
  },
...
  "watch": {
    "watch-preserve-output": true
  }
...
Keys cannot be duplicated within the same or different namespaces.
~~~

What happens: the key is set in `nodeOptions` and again in the `watch` namespace, which the same section forbids. With the example saved verbatim as `node.config.json` (Node.js v24.15.0):

~~~text
$ node --experimental-config-file=node.config.json app.js
Option --watch-preserve-output is already defined
node: node.config.json: invalid content
(exit code 9)
~~~

Removing the `watch` block makes the file parse. On main the check is in `src/node_config_file.cc`: one `unique_options` set (line 397) is passed for every namespace (line 496), and lines 253-256 reject the repeat.

Suggested change (keep the key in one place):

~~~diff
   "test": {
     "test-isolation": "process"
-  },
-  "watch": {
-    "watch-preserve-output": true
   }

The "equivalent command line" below it (main line 967) also omits `--test`, which the `test` namespace enables automatically according to the same section; it could read:
  node --import amaro/strip --watch-path=src --watch-preserve-output --test --test-isolation=process
~~~

### deprecations.md, DEP0047: the "stronger approach" for `util.isDate()` is never true

Page: https://nodejs.org/docs/latest-v24.x/api/deprecations.html#dep0047-utilisdate
Source (main): https://github.com/nodejs/node/blob/main/doc/api/deprecations.md#L1158-L1160

Current text (main, `doc/api/deprecations.md` lines 1155-1160):

~~~text
The `util.isDate()` API has been removed. Please use
`arg instanceof Date` instead.

Also for stronger approaches, consider using:
`Date.prototype.toString.call(arg) === '[object Date]' && !isNaN(arg)`.
This can also be used in a `try/catch` block to handle invalid date objects.
~~~

What happens: `Date.prototype.toString` returns the readable date string for a Date, never `'[object Date]'`, and throws for any other receiver. The expression, run verbatim:

~~~text
$ node isdate.js
doc expression    new Date()           -> false
Object.prototype  new Date()           -> true
doc expression    new Date('invalid')  -> false
Object.prototype  new Date('invalid')  -> false
doc expression    {}                   -> throws TypeError: Method Date.prototype.toString called on incompatible receiver #<Object>
Object.prototype  {}                   -> false
doc expression    '2020-01-01'         -> throws TypeError: Method Date.prototype.toString called on incompatible receiver 2020-01-01
Object.prototype  '2020-01-01'         -> false
(exit code 0)
~~~

The check as written never reports a valid Date. `Object.prototype.toString` was presumably meant.

Suggested change:

~~~diff
-Also for stronger approaches, consider using:
-`Date.prototype.toString.call(arg) === '[object Date]' && !isNaN(arg)`.
-This can also be used in a `try/catch` block to handle invalid date objects.
+For a check that also works across realms and rejects invalid dates, use:
+`Object.prototype.toString.call(arg) === '[object Date]' && !isNaN(arg)`.
+`util.types.isDate(arg)` can also be used.

(The try/catch sentence is no longer needed: `Object.prototype.toString.call()` does not throw.)
~~~

### esm.md, JavaScript String Builtins: the `.wat` sample exports an undeclared identifier

Page: https://nodejs.org/docs/latest-v24.x/api/esm.html#javascript-string-builtins
Source (main): https://github.com/nodejs/node/blob/main/doc/api/esm.md#L810-L816

Current text (main, `doc/api/esm.md` lines 810, 816):

~~~text
  (func $getLength (param $str externref) (result i32)
  (export "getLength" (func $get_length))
~~~

What happens: the function is declared as `$getLength`, but the export references `$get_length`, which appears nowhere else in the module. An identifier that is not bound makes the text malformed, so the `string-len.wasm` imported by the next two examples cannot be built from this text. This was checked by reading the text (no assembler was run). With the export pointing at `$getLength`, the module (encoded by hand) imports on v24.15.0 and `getLength('foo')` prints `3`, as the page says.

Suggested change:

~~~diff
-  (export "getLength" (func $get_length))
+  (export "getLength" (func $getLength))
~~~

### n-api.md, Module registration: the `NAPI_MODULE_INIT` example does not compile

Page: https://nodejs.org/docs/latest-v24.x/api/n-api.html#module-registration
Source (main): https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L2140-L2151

Current text (main, `doc/api/n-api.md` lines 2140-2147):

~~~text
NAPI_MODULE_INIT(/* napi_env env, napi_value exports */) {
  napi_value answer;
  napi_status result;

  status = napi_create_int64(env, 42, &answer);
  if (status != napi_ok) return NULL;

  status = napi_set_named_property(env, exports, "answer", answer);
~~~

What happens: the example declares `result` but assigns and tests `status`. `NAPI_MODULE_INIT()` (`src/node_api.h` lines 68-76 on main) expands to a function whose only parameters are `env` and `exports`, so `status` is undeclared. Checked against the headers; not compiled.

Suggested change:

~~~diff
-  napi_status result;
+  napi_status status;
~~~

### n-api.md, Working with JavaScript properties: the `napi_define_properties` example does not compile

Page: https://nodejs.org/docs/latest-v24.x/api/n-api.html#working-with-javascript-properties
Source (main): https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L4565-L4590

Current text (main, `doc/api/n-api.md` lines 4558-4559, 4566, 4581-4584):

~~~text
  'foo': { value: 123, writable: true, configurable: true, enumerable: true },
  'bar': { value: 456, writable: true, configurable: true, enumerable: true },
...
napi_status status = napi_status_generic_failure;
...
napi_property_descriptor descriptors[] = {
  { "foo", NULL, NULL, NULL, NULL, fooValue, napi_writable | napi_configurable, NULL },
  { "bar", NULL, NULL, NULL, NULL, barValue, napi_writable | napi_configurable, NULL }
}
~~~

What happens: (1) `napi_status_generic_failure` is not a `napi_status` value; the enumerator is `napi_generic_failure` (`src/js_native_api_types.h` line 149 on main), as the previous example on the page uses. (2) The `descriptors` initializer has no closing `;`. (3) The JavaScript it mirrors sets `enumerable: true`, but the descriptors pass only `napi_writable | napi_configurable` (`napi_enumerable` is a separate bit, line 93). Checked against the headers; not compiled.

Suggested change:

~~~diff
-napi_status status = napi_status_generic_failure;
+napi_status status = napi_generic_failure;
 ...
 napi_property_descriptor descriptors[] = {
-  { "foo", NULL, NULL, NULL, NULL, fooValue, napi_writable | napi_configurable, NULL },
-  { "bar", NULL, NULL, NULL, NULL, barValue, napi_writable | napi_configurable, NULL }
-}
+  { "foo", NULL, NULL, NULL, NULL, fooValue, napi_writable | napi_enumerable | napi_configurable, NULL },
+  { "bar", NULL, NULL, NULL, NULL, barValue, napi_writable | napi_enumerable | napi_configurable, NULL }
+};

(`napi_default_jsproperty` could replace the three flags where NAPI_VERSION >= 8.)
~~~

### repl.md: the REPL-over-socket client throws `ReferenceError: done is not defined` on close

Page: https://nodejs.org/docs/latest-v24.x/api/repl.html#full-featured-terminal-repl-over-netserver-and-netsocket
Source (main): https://github.com/nodejs/node/blob/main/doc/api/repl.md#L1027-L1031

Current text (main, `doc/api/repl.md` lines 1027-1031 (mjs), 1062 (cjs)):

~~~text
sock.on('close', () => {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  sock.removeListener('close', done);
});
~~~

What happens: `done` is not defined anywhere in the example (ESM and CJS variants), so the handler throws whenever the socket closes. Running the documented server and client on localhost and typing `.exit` (stdin piped, with a no-op `setRawMode` because a pipe is not a TTY; the example is otherwise unchanged):

~~~text
$ printf '.exit\n' | node repl-client.js
repl-client.js:18
  sock.removeListener('close', done);
                               ^

ReferenceError: done is not defined
    at Socket.<anonymous> (file:///.../repl-client.js:18:32)
    at Socket.emit (node:events:521:24)
    at TCP.<anonymous> (node:net:350:12)

Node.js v24.15.0
(exit code 1)
~~~

Suggested change: the listener is about to be removed anyway when the socket closes, so the line can go:

~~~diff
 sock.on('close', () => {
   process.stdin.setRawMode(false);
   process.stdin.pause();
-  sock.removeListener('close', done);
 });
(same change in the CJS variant). If the intent was a one-shot handler, `sock.once('close', () => { ... })` does it without a named reference.
~~~

### single-executable-applications.md: steps 7-8 sign and run a file that was never created; v24 docs only (main is correct)

Page: https://nodejs.org/docs/latest-v24.x/api/single-executable-applications.html
Source (v24.x): https://github.com/nodejs/node/blob/v24.22.3/doc/api/single-executable-applications.md#L58-L163

Current text (v24.22.3, `doc/api/single-executable-applications.md` lines 63, 69, 98, 109, 137, 146, 154, 161):

~~~text
   cp $(command -v node) hello
   node -e "require('fs').copyFileSync(process.execPath, 'hello.exe')"
   * `sea-prep.blob` - The name of the blob created in step 1.
     npx postject hello NODE_SEA_BLOB sea-prep.blob \
   codesign --sign - sea
   signtool sign /fd SHA256 sea.exe
   $ ./sea world
   $ .\sea.exe world
~~~

What happens: steps 4-6 create and inject `hello` / `hello.exe`; steps 7 and 8 use `sea` / `sea.exe`. Following steps 1-4 for Windows on v24.15.0 and then step 8 (step 6 needs the network and was skipped; the failure does not depend on it):

~~~text
$ steps 1-4 for Windows as documented, then step 8: ./sea.exe world
Wrote single executable preparation blob to sea-prep.blob
(ls: hello.exe hello.js sea-config.json sea-prep.blob)
./sea.exe: No such file or directory
(exit code 127)
~~~

On macOS the required re-sign in step 7 fails the same way. Step 6 also says the blob was "created in step 1"; it is created in step 3. Main was rewritten around `--build-sea` and uses one name throughout, so this concerns the v24.x line only.

Suggested change (v24.x):

~~~diff
-   codesign --sign - sea
+   codesign --sign - hello
-   signtool sign /fd SHA256 sea.exe
+   signtool sign /fd SHA256 hello.exe
-   $ ./sea world
+   $ ./hello world
-   $ .\sea.exe world
+   $ .\hello.exe world
-   * `sea-prep.blob` - The name of the blob created in step 1.
+   * `sea-prep.blob` - The name of the blob created in step 3.
~~~

### stream.md: `readable.filter()`, `forEach()` and `toArray()` examples destructure an array as an object

Page: https://nodejs.org/docs/latest-v24.x/api/stream.html#readablefilterfn-options
Source (main): https://github.com/nodejs/node/blob/main/doc/api/stream.md#L2297-L2300

Current text (main, `doc/api/stream.md` lines 2297-2300, 2357-2360, 2404-2407):

~~~text
]).filter(async (domain) => {
  const { address } = await resolver.resolve4(domain, { ttl: true });
  return address.ttl > 60;
}, { concurrency: 2 });
...
  const { address } = await resolver.resolve4(domain, { ttl: true });
  return address;
...
  const { address } = await resolver.resolve4(domain, { ttl: true });
  return address;
~~~

What happens: with `{ ttl: true }`, `resolve4()` resolves to an array of `{ address, ttl }` objects (`doc/api/dns.md` lines 1264-1267; `lib/internal/dns/promises.js` lines 304-306 on main), so `const { address } = ...` gives `undefined`. Run against a DNS stub on 127.0.0.1 that answers with two A records (TTL 300):

~~~text
$ node filter.mjs ; node foreach.mjs ; node toarray.mjs
filter.mjs:
3
4
filter.mjs:16
  return address.ttl > 60;
                 ^
TypeError: Cannot read properties of undefined (reading 'ttl')
    at async filterFn (node:internal/streams/operators:219:9)
(exit 1)

foreach.mjs:
3
4
undefined
undefined
undefined
done
(exit 0)

toarray.mjs:
[ undefined, undefined, undefined ]
(exit 0)
~~~

Suggested change:

~~~diff
 filter:
-  const { address } = await resolver.resolve4(domain, { ttl: true });
-  return address.ttl > 60;
+  const records = await resolver.resolve4(domain, { ttl: true });
+  return records.some(({ ttl }) => ttl > 60);
 forEach and toArray:
-  const { address } = await resolver.resolve4(domain, { ttl: true });
-  return address;
+  const records = await resolver.resolve4(domain, { ttl: true });
+  return records.map(({ address }) => address);
(or drop `{ ttl: true }` there and return the plain array of addresses).
~~~

### stream.md, `readable.read()`: the whole-file example joins Buffer chunks as strings

Page: https://nodejs.org/docs/latest-v24.x/api/stream.html#readablereadsize
Source (main): https://github.com/nodejs/node/blob/main/doc/api/stream.md#L1623-L1639

Current text (main, `doc/api/stream.md` lines 1623-1638):

~~~text
Therefore to read a file's whole contents from a `readable`, it is necessary
to collect chunks across multiple `'readable'` events:

const chunks = [];

readable.on('readable', () => {
  let chunk;
  while (null !== (chunk = readable.read())) {
    chunks.push(chunk);
  }
});

readable.on('end', () => {
  const content = chunks.join('');
});
~~~

What happens: without `setEncoding()` the chunks are Buffers, and `Array.prototype.join('')` decodes each one separately (`lib/buffer.js` lines 981-983 on main), so a multi-byte character split across two chunks becomes replacement characters. A file of 65535 `a` bytes followed by `€` (3 bytes, across the 64 KiB chunk boundary), read with `fs.createReadStream()` and the documented lines:

~~~text
$ node whole_file.js
chunks: 2 65536 + 32 bytes
equal to file contents: false
U+FFFD count: 3
around boundary: "aa\ufffd\ufffd\ufffd and mo"
Buffer.concat(chunks).toString("utf8") equal: true
(exit code 0)
~~~

Suggested change:

~~~diff
 readable.on('end', () => {
-  const content = chunks.join('');
+  const content = Buffer.concat(chunks).toString('utf8');
 });

or call `readable.setEncoding('utf8')` before reading, so that the chunks are strings decoded across chunk boundaries, and keep `chunks.join('')`.
~~~

### stream_iter.md, `duplex()`: the echo example reads the wrong end; v24 docs only (main is correct)

Page: https://nodejs.org/docs/latest-v24.x/api/stream_iter.html
Source (v24.x): https://github.com/nodejs/node/blob/v24.22.3/doc/api/stream_iter.md#L864-L881

Current text (v24.22.3, `doc/api/stream_iter.md` lines 869-880 (mjs), 899 (cjs)):

~~~text
// Server echoes back
const serving = (async () => {
  for await (const chunks of server.readable) {
    await server.writer.writev(chunks);
  }
})();

await client.writer.write('hello');
await client.writer.end();

console.log(await text(server.readable)); // handled by echo
await serving;
~~~

What happens: in `lib/internal/streams/iter/duplex.js` (v24.22.3, lines 42-56) the server's writer feeds `client.readable`, and `server.readable` carries what the client wrote. The echo therefore lands in `client.readable`, which the example never reads, while `text(server.readable)` competes with the echo loop for the client's own data on a readable with one shared consumer state (lines 78-80). The server writer is never ended. Not run: `node:stream/iter` is not in v24.15.0; checked against the v24.22.3 source. Main already has the fix below; this asks for it on the v24.x line.

Suggested change (as on main):

~~~diff
   for await (const chunks of server.readable) {
     await server.writer.writev(chunks);
   }
+  await server.writer.end();
 })();
 ...
-console.log(await text(server.readable)); // handled by echo
+console.log(await text(client.readable)); // 'hello'
(same change in the CJS variant).
~~~

### test.md, Custom reporters: the `stream.Transform` reporter stops at the first unlisted event

Page: https://nodejs.org/docs/latest-v24.x/api/test.html#custom-reporters
Source (main): https://github.com/nodejs/node/blob/main/doc/api/test.md#L1507-L1553

Current text (main, `doc/api/test.md` lines 1512-1515, 1543-1549 (mjs); 1560-1563 (cjs)):

~~~text
  transform(event, encoding, callback) {
    switch (event.type) {
      case 'test:dequeue':
        callback(null, `test ${event.data.name} dequeued`);
...
      case 'test:coverage': {
        const { totalLineCount } = event.data.summary.totals;
        callback(null, `total line count: ${totalLineCount}\n`);
        break;
      }
    }
  },
~~~

What happens: the `switch` has no `default` branch, so `callback` is never called for an unlisted event type, and a Transform does not accept the next chunk until it is (`lib/internal/streams/transform.js` lines 164-193 on main). `test:complete` is emitted for every test and is not listed. With three passing tests:

~~~text
$ node --test --test-reporter=./reporter.mjs sample.test.mjs
test sample.test.mjs enqueuedtest sample.test.mjs dequeuedtest a enqueuedtest a dequeuedtest b enqueuedtest c enqueued
(exit code 0; nothing is printed after this)
~~~

With a failing test no `failed` line is printed; only the exit code (1) shows the failure. Adding `default: callback();` prints the start, pass and plan lines for all three tests.

Suggested change (both the ESM and CJS variants):

~~~diff
       case 'test:coverage': {
         const { totalLineCount } = event.data.summary.totals;
         callback(null, `total line count: ${totalLineCount}\n`);
         break;
       }
+      default:
+        callback();
     }
   },

The generator-based example is not affected (an unlisted event just yields nothing). The same symptom was reported in nodejs/node#48894.
~~~

### test.md, Mocking timers: the `timers/promises` `setInterval` example fails its first assertion

Page: https://nodejs.org/docs/latest-v24.x/api/test.html#working-with-nodejs-timers-modules
Source (main): https://github.com/nodejs/node/blob/main/doc/api/test.md#L3389-L3419

Current text (main, `doc/api/test.md` lines 3393, 3396-3417 (mjs); 3448 (cjs)):

~~~text
test('should tick five times testing a real use case', async (context) => {
...
  const startedAt = Date.now();
...
    for await (const time of nodeTimersPromises.setInterval(interval, startedAt)) {
      times.push(time);
...
  for (let it = 1; it < expectedIterations; it++) {
    assert.strictEqual(timeResults[it - 1], startedAt + (interval * it));
  }
~~~

What happens: `timersPromises.setInterval(delay, value)` yields `value` on every tick, and so does the mock (`lib/internal/test_runner/mock/mock_timers.js` lines 458-484 on main). Every element of `timeResults` is therefore `startedAt`:

~~~text
$ node --test interval.test.mjs
✖ should tick five times testing a real use case
ℹ pass 0
ℹ fail 1
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected
+ 1794827950930
- 1794827951930
(exit code 1)
~~~

The title also says five ticks while the test runs three, and the loop checks only two of the three results.

Suggested change (both variants):

~~~diff
-test('should tick five times testing a real use case', async (context) => {
+test('should tick three times testing a real use case', async (context) => {
 ...
   assert.strictEqual(timeResults.length, expectedIterations);
-  for (let it = 1; it < expectedIterations; it++) {
-    assert.strictEqual(timeResults[it - 1], startedAt + (interval * it));
-  }
+  // setInterval() yields the value it was given on every tick.
+  assert.deepStrictEqual(timeResults, [startedAt, startedAt, startedAt]);

With that change the test passes on v24.15.0. (Recording `Date.now()` inside the loop with Date also mocked does not work as a replacement: the three synchronous `tick()` calls run before the loop resumes.)
~~~

### tls.md: the `openssl pkcs12` steps write PKCS#12 files that the examples read as PEM

Page: https://nodejs.org/docs/latest-v24.x/api/tls.html#tlscreateserveroptions-secureconnectionlistener
Source (main): https://github.com/nodejs/node/blob/main/doc/api/tls.md#L2370-L2385
Source (main, tls.connect() section): https://github.com/nodejs/node/blob/main/doc/api/tls.md#L1938-L1950

Current text (main, `doc/api/tls.md` lines 2321-2328, 2373-2385, 1881-1885, 1941-1949):

~~~text
  key: readFileSync('server-key.pem'),
  cert: readFileSync('server-cert.pem'),
  ca: [ readFileSync('client-cert.pem') ],
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -keyout server-key.pem -out server-cert.pem
Then, to generate the `client-cert.pem` certificate for this example, run:
openssl pkcs12 -certpbe AES-256-CBC -export -out client-cert.pem \
  -inkey server-key.pem -in server-cert.pem
The server can be tested by connecting to it using the example client from
[`tls.connect()`][].
...
  key: readFileSync('client-key.pem'),
  cert: readFileSync('client-cert.pem'),
  ca: [ readFileSync('server-cert.pem') ],
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -keyout client-key.pem -out client-cert.pem
openssl pkcs12 -certpbe AES-256-CBC -export -out server-cert.pem \
  -inkey client-key.pem -in client-cert.pem
~~~

What happens: `openssl pkcs12 -export` writes a binary PKCS#12 bundle whatever the extension. The examples pass these files as `ca` (and the other example as `cert`), which expect PEM; PKCS#12 is accepted only through `pfx`. The bundle also wraps the same side's own certificate, not the peer's. Each section overwrites a file the other one created, so whichever section is followed second, the other side fails at startup (v24.15.0, OpenSSL 3.5.5, `-passout pass:` added to skip the prompt):

~~~text
Error: error:0480006C:PEM routines::no start line
~~~

With the server section alone, the server starts and loads no usable CA from `client-cert.pem`. With two plain PEM pairs (only the two `openssl req` commands), both sides report `authorized` and the echo works.

Suggested change: drop the `openssl pkcs12` steps and generate one PEM key pair per side, used by both examples:

~~~diff
In the tls.createServer() section:
-Then, to generate the `client-cert.pem` certificate for this example, run:
-
-```bash
-openssl pkcs12 -certpbe AES-256-CBC -export -out client-cert.pem \
-  -inkey server-key.pem -in server-cert.pem
-```
+`client-key.pem` and `client-cert.pem` are generated as shown for the example
+client in [`tls.connect()`][]; the server trusts `client-cert.pem` as its `ca`.

In the tls.connect() section:
-Then, to generate the `server-cert.pem` certificate for this example, run:
-
-```bash
-openssl pkcs12 -certpbe AES-256-CBC -export -out server-cert.pem \
-  -inkey client-key.pem -in client-cert.pem
-```
+`server-key.pem` and `server-cert.pem` are generated as shown for the echo
+server in [`tls.createServer()`][]; the client trusts `server-cert.pem` as its `ca`.
~~~

### webcrypto.md: `KmacParams` documents its algorithm member as `algorithm`; the API requires `name`

Page: https://nodejs.org/docs/latest-v24.x/api/webcrypto.html#kmacparamsalgorithm
Source (main): https://github.com/nodejs/node/blob/main/doc/api/webcrypto.md#L2449-L2455

Current text (main, `doc/api/webcrypto.md` lines 2437, 2449-2455):

~~~text
### Class: `KmacParams`
...
#### `kmacParams.algorithm`

<!-- YAML
added: v24.8.0
-->

* Type: {string} Must be `'KMAC128'` or `'KMAC256'`.
~~~

What happens: the dictionary member is `name`, from `Algorithm`: `lib/internal/crypto/webidl.js` builds `KmacParams` from `dictAlgorithm` (`name`, required; lines 128-134 and 789-810 on main) with `outputLength` and `customization`, and has no `algorithm` key. Every other params class on the page documents `name`. Passing the object as documented:

~~~text
$ node kmac.mjs
generateKey({ name: "KMAC128" }) -> { name: 'KMAC128', length: 128 }
sign/verify documented { algorithm: "KMAC128", outputLength: 256 }: TypeError: Failed to normalize algorithm: passed algorithm can not be converted to 'Algorithm' because 'name' is required in 'Algorithm'.
sign/verify { name: "KMAC128", outputLength: 256 }: 32 bytes, verify=true
(exit code 0)
~~~

Suggested change:

~~~diff
-#### `kmacParams.algorithm`
+#### `kmacParams.name`

(the anchor becomes #kmacparamsname; check for links to #kmacparamsalgorithm).
~~~

Two further Medium items (the module.md hook examples) are left out because the open pull request #66378 addresses them. The lower-severity items and full reproductions are at https://github.com/ondrejdvorak78/nodejs-v24-api-docs-errors. Source of the findings: Nacodex audit, https://nacodex.help/samples/nodejs-api-docs-1/ and https://nacodex.help/samples/nodejs-api-docs-2/.

I prepared this report with an AI assistant. 10 of the 14 items were reproduced by running the example on Node v24.15.0, using the scripts in the repository above; the other 4 were checked against the source. I reviewed every item before posting.
