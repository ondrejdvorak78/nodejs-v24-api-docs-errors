# Node.js v24 API documentation: errors found in an audit of v24.22.1, re-checked against v24.22.3 (16 November 2026)

The findings in this record come from a Nacodex audit of the Node.js v24.22.1 API documentation, with the pages fetched on 21 October 2026. The audit was published in two parts, at https://nacodex.help/samples/nodejs-api-docs-1/ and https://nacodex.help/samples/nodejs-api-docs-2/. On 16 November 2026 every finding was re-checked: the line the audit cited was looked up in today's v24.22.3 documentation (the latest v24 release) and in `doc/api` on the `main` branch (fetched at 2026-11-16T10:50:57Z and 2026-11-16T11:05:51Z); the examples behind the Medium findings were run on Node.js v24.15.0, with network access limited to localhost; and where an example could not be run, the claim was checked against the source on `main` (for `node:stream/iter`, the v24.22.3 source). The re-check and this write-up were prepared with the help of an AI assistant. The scripts used to run the examples are in [`repro/`](repro/). Each item can be checked against the current documentation; what matters is whether it is correct and whether it is fixed, not who found it or how.

## Totals

All counts below are computed from the per-finding records.

| | Part 1 | Part 2 | Both |
|---|---|---|---|
| Findings | 16 | 35 | 51 |
| Still present in v24.22.3 | 15 | 33 | 48 |
| Fixed in v24.22.3 | 0 | 0 | 0 |
| Wrong at audit (withdrawn) | 1 | 1 | 2 |
| Could not check | 0 | 1 | 1 |

On `main`: 48 still present, 3 fixed (1-14, 2-13, 2-16). None of these is fixed in v24.22.3.

Ratings now (the findings still present in v24.22.3):

| Rating | Part 1 | Part 2 | Both |
|---|---|---|---|
| HIGH | 0 | 0 | 0 |
| MEDIUM | 5 | 11 | 16 |
| LOW | 7 | 14 | 21 |
| INFO | 3 | 8 | 11 |
| Total rated | 15 | 33 | 48 |

Ratings at audit, all 51 findings: HIGH 0, MEDIUM 16, LOW 26, INFO 9. 5 ratings changed on re-reading: 1-15 LOW → INFO; 2-25 LOW → INFO; 2-29 LOW → MEDIUM; 2-31 LOW → INFO; 2-34 INFO → LOW. 4 Low findings carry a stated condition under which they would be Medium.

The 16 Medium findings were checked a second time: 12 confirmed by running the example, 4 confirmed from the source (no C compiler, no WebAssembly text assembler, or no `node:stream/iter` in v24.15.0), 0 not confirmed, 0 downgraded. Of these, 2 (1-5, 1-6) are addressed by the open (not yet merged) pull request [nodejs/node#66378](https://github.com/nodejs/node/pull/66378), and 2 (2-13, 2-16) are fixed on `main` only. The remaining 14 are written up for the Node.js tracker in [`ISSUE_COPY.md`](ISSUE_COPY.md).

## How to read an entry

- **Status** describes the cited text in v24.22.3: *still present* (the same text is served), *wrong at audit* (on re-reading v24.22.1 and its source the finding does not hold), or *could not check* (the page is not published). The state on `main` is given separately.
- **Rating** is the audit's rating → the rating on today's docs.
- **Current text** is quoted from the v24.22.3 `doc/api` source; each quoted line was matched verbatim against the fetched file (see [`CHECKS.json`](CHECKS.json)).
- Links point at the current source on `main` and the rendered v24 page.

## Medium findings (16)

### 1-5: Load-hook sample throws away its own source rewrite
- Page: `module.md`, section "Synchronous `load(url, context, nextLoad)`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/module.md#L1004
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/module.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present
- **Already in PR [#66378](https://github.com/nodejs/node/pull/66378)**

Current text (v24.22.3, `doc/api/module.md`):

~~~text
source: source.replace(/foo/g, 'bar'),
    ...result,
~~~


**Problem.** A developer copying the synchronous load-hook sample for registerHooks() in module.md gets the unmodified module source back, with no error; the 'foo' -> 'bar' rewrite the comment promises never happens.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/1-5.mjs`](repro/1-5.mjs).

~~~text
$ node --import ./hooks.mjs main.mjs
word = foo
(exit 0)
~~~

Control:

~~~text
$ node --import ./hooks_fixed.mjs main.mjs  (same file with ...result moved before source)
word = bar
~~~

Source:

- Language semantics: in an object literal a later spread property overwrites an earlier key of the same name; result.source from nextLoad() replaces the rewritten source. No Node.js implementation detail involved.

**Suggested doc change**:

~~~diff
-  return {
-    source: source.replace(/foo/g, 'bar'),
-    ...result,
-  };
+  return {
+    ...result,
+    source: source.replace(/foo/g, 'bar'),
+  };
~~~

### 1-6: Synchronous import-map hook sample calls readFileSync on the promises module
- Page: `module.md`, section "Synchronous version"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/module.md#L1141
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/module.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present
- **Already in PR [#66378](https://github.com/nodejs/node/pull/66378)**

Current text (v24.22.3, `doc/api/module.md`):

~~~text
import fs from 'node:fs/promises';
~~~


**Problem.** A developer running the synchronous import-map hooks sample in module.md (Import maps) gets TypeError: fs.readFileSync is not a function on every run, before any hook is registered.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/1-6.mjs`](repro/1-6.mjs).

~~~text
$ node --import ./import-map-sync-hooks.js main.js
import-map-sync-hooks.js:5
const { imports } = JSON.parse(fs.readFileSync('import-map.json', 'utf-8'));
                                  ^

TypeError: fs.readFileSync is not a function
    at file:///.../import-map-sync-hooks.js:5:35
    at ModuleJob.run (node:internal/modules/esm/module_job:437:25)

Node.js v24.15.0
(exit 1)
~~~

Source:

- lib/fs/promises: the promises namespace exports readFile but no readFileSync (doc/api/fs.md documents readFileSync only on node:fs).

**Suggested doc change**:

~~~diff
-import fs from 'node:fs/promises';
+import fs from 'node:fs';
~~~

### 1-7: WebAssembly text sample exports an identifier it never defined
- Page: `esm.md`, section "JavaScript String Builtins"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/esm.md#L816
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/esm.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/esm.md`):

~~~text
(export "getLength" (func $get_length))
~~~


**Problem.** A developer assembling the string-builtins .wat sample in esm.md (the only way to produce the string-len.wasm the next two examples import) gets an assembler error every time: the export names $get_length, which the module never declares.

**Check** (confirmed by source, Node.js v24.15.0). Script: [`repro/1-7.mjs`](repro/1-7.mjs).

~~~text
$ node check_wat.js
declared: $string_length $getLength $str
export -> $get_length: UNBOUND
call -> $string_length: bound
(exit 1)
~~~

Control:

~~~text
$ node build_fixed_wasm.js && node main.mjs   (main.mjs = main esm.md lines 821-822 with console.log)
3
(node) ExperimentalWarning: Importing WebAssembly module instances is an experimental feature and might change at any time
~~~

Limits: No WebAssembly text assembler (wabt / wasm-tools) is installed and installing was out of scope, so the assembler's own error message was not captured. grep: 'get_length' occurs once on each branch (main and v24.22.3), only in the export line.

Source:

- WebAssembly core spec, text format, Indices (https://webassembly.github.io/spec/core/text/modules.html#indices): a symbolic identifier used as a funcidx is looked up in the identifier context of the module; an identifier that is not bound there makes the text malformed.
- doc/api/esm.md (main) lines 806 and 810 declare $string_length and $getLength; line 816 references $get_length.

**Suggested doc change**:

~~~diff
-  (export "getLength" (func $get_length))
+  (export "getLength" (func $getLength))
~~~

### 1-8: Suggested replacement for util.isDate() is never true
- Page: `deprecations.md`, section "DEP0047: `util.isDate()`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/deprecations.md#L1159
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/deprecations.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/deprecations.md`):

~~~text
`Date.prototype.toString.call(arg) === '[object Date]' && !isNaN(arg)`.
~~~


**Problem.** A developer migrating off the removed util.isDate() (DEP0047) who adopts the page's 'stronger approach' gets false for every valid Date and a TypeError for every non-Date; wrapped in try/catch as the page suggests, the check never reports a Date.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/1-8.mjs`](repro/1-8.mjs).

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
(exit 0)
~~~

Source:

- ECMA-262 Date.prototype.toString: for a Date receiver it returns a human-readable date string (e.g. 'Thu Jan 01 1970 ...'), never '[object Date]'; for a non-Date receiver it throws TypeError. Object.prototype.toString returns '[object Date]' for Date objects. Language behaviour, not Node.js-specific.

**Suggested doc change**:

~~~diff
-Also for stronger approaches, consider using:
-`Date.prototype.toString.call(arg) === '[object Date]' && !isNaN(arg)`.
-This can also be used in a `try/catch` block to handle invalid date objects.
+For a check that also works across realms and rejects invalid dates, use:
+`Object.prototype.toString.call(arg) === '[object Date]' && !isNaN(arg)`.
+`util.types.isDate(arg)` can also be used.

(The try/catch sentence is no longer needed: `Object.prototype.toString.call()` does not throw.)
~~~

### 1-9: Config-file example contains a key the page says is forbidden
- Page: `cli.md`, section "`--experimental-config-file=path`, `--experimental-config-file`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/cli.md#L871
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/cli.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/cli.md`):

~~~text
"watch": {
    "watch-preserve-output": true
  }
~~~


**Problem.** A developer who saves the first (and only complete) configuration-file example in cli.md and runs node with it gets 'Option --watch-preserve-output is already defined ... invalid content' and Node.js exits with code 9 before running anything. On main the flag is now the stable --config-file.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/1-9.mjs`](repro/1-9.mjs).

~~~text
$ node --experimental-config-file=node.config.json app.js
Option --watch-preserve-output is already defined
node: node.config.json: invalid content
(exit 9)
~~~

Control:

~~~text
$ node --experimental-config-file=node.config.nodup.json app.js  (same file without the "watch" namespace)
configuration accepted; Node.js proceeds to watch mode and stops on the missing ./src directory (ENOENT ... watch '...\src'), i.e. past config parsing
~~~

Source:

- src/node_config_file.cc (main) :397 `std::unordered_set<std::string> unique_options;` declared once per file
- src/node_config_file.cc (main) :496 `ParseOptions(&namespace_object, &unique_options, namespace_name);` the same set is passed for every namespace
- src/node_config_file.cc (main) :253-256 `if (unique_options->contains(option->first)) { FPrintF(stderr, "Option %s is already defined\n", option->first); return ParseResult::InvalidContent; }`
- src/node.cc (main) :1031 `errors->push_back(std::string(*config_path) + ": invalid content");`

**Suggested doc change** (keep the key in one place):

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

### 2-9: NAPI_MODULE_INIT example does not compile
- Page: `n-api.md`, section "Module registration"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L2142
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/n-api.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/n-api.md`):

~~~text
  napi_status result;

  status = napi_create_int64(env, 42, &answer);
~~~


**Problem.** An addon author who copies the NAPI_MODULE_INIT example from n-api.md (Module registration) gets a compile error ('status' undeclared) every time; the variable is declared as 'result'.

**Check** (confirmed by source, Node.js headers from main (fetched 2026-11-16); installed runtime v24.15.0 not involved). Script: [`repro/2-9.mjs`](repro/2-9.mjs).

not compiled: no C compiler available in the test environment (search for MSVC was not permitted, no gcc/clang on PATH)

Read main src/node_api.h: the macro supplies only the parameters env and exports; nothing declares 'status'. grep of the sample: 'status' is assigned on lines 2144 and 2147 and read on 2145 and 2148; the only declaration is 'napi_status result;' on 2142.

Source:

- src/node_api.h (main) :68-76 `#define NAPI_MODULE_INIT() ... napi_value NAPI_MODULE_INITIALIZER(napi_env env, napi_value exports)` the expansion declares no other identifiers, so the body sees only env and exports

**Suggested doc change**:

~~~diff
-  napi_status result;
+  napi_status status;
~~~

### 2-10: napi_define_properties walkthrough does not compile
- Page: `n-api.md`, section "Working with JavaScript properties"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L4566
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/n-api.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/n-api.md`):

~~~text
napi_status status = napi_status_generic_failure;
~~~


**Problem.** An addon author copying the napi_define_properties counterpart in n-api.md (Working with JavaScript properties) gets compile errors (unknown identifier napi_status_generic_failure, missing ';' after the descriptor array); once those are fixed, the properties are non-enumerable, unlike the JavaScript it claims to mirror.

**Check** (confirmed by source, Node.js headers from main (fetched 2026-11-16)). Script: [`repro/2-10.mjs`](repro/2-10.mjs).

not compiled: no C compiler available in the test environment

grep of main src/*.h for napi_status_generic_failure: no hit. The napi_status enum names the value napi_generic_failure, which the preceding example on the same page (main line 4540) uses correctly. Line 4584 closes the initializer with '}' and no ';' before the next statement.

Source:

- src/js_native_api_types.h (main) :149 `napi_generic_failure,` inside `typedef enum { ... } napi_status;` (:164); no napi_status_generic_failure
- src/js_native_api_types.h (main) :92-94 `napi_writable = 1 << 0, napi_enumerable = 1 << 1, napi_configurable = 1 << 2,` and :105 `napi_default_jsproperty = napi_writable | napi_enumerable | napi_configurable`

**Suggested doc change**:

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

### 2-12: REPL client example throws on every normal exit
- Page: `repl.md`, section "Full-featured "terminal" REPL over `net.Server` and `net.Socket`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/repl.md#L1030
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/repl.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/repl.md`):

~~~text
  sock.removeListener('close', done);
~~~


**Problem.** A developer running the REPL-over-socket client from repl.md (ESM and CJS versions) gets ReferenceError: done is not defined, and exit code 1, every time the connection closes (.exit, Ctrl+D, server stop).

**Check** (confirmed, Node.js v24.15.0 (localhost:1337 only)). Script: [`repro/2-12.mjs`](repro/2-12.mjs).

~~~text
$ node repl-server.js &  then  printf '.exit\n' | node --import ./tty-shim.mjs repl-client.js
repl-client.js:18
  sock.removeListener('close', done);
                               ^

ReferenceError: done is not defined
    at Socket.<anonymous> (file:///.../repl-client.js:18:32)
    at Socket.emit (node:events:521:24)
    at TCP.<anonymous> (node:net:350:12)

Node.js v24.15.0
(exit 1)
~~~

Source:

- grep of main doc/api/repl.md: the identifier 'done' occurs only on lines 1030 and 1062, both as the removeListener argument; it is never declared.

**Suggested doc change**: the listener is about to be removed anyway when the socket closes, so the line can go:

~~~diff
 sock.on('close', () => {
   process.stdin.setRawMode(false);
   process.stdin.pause();
-  sock.removeListener('close', done);
 });
(same change in the CJS variant). If the intent was a one-shot handler, `sock.once('close', () => { ... })` does it without a named reference.
~~~

### 2-13: Single-executable tutorial builds one file name and then signs and runs another
- Page: `single-executable-applications.md`, section "(page introduction)"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/single-executable-applications.md#L56
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/single-executable-applications.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: fixed
- **Fixed on main only**

Current text (v24.22.3, `doc/api/single-executable-applications.md`):

~~~text
   codesign --sign - sea
~~~

Current text (main, `doc/api/single-executable-applications.md`):

~~~text
   echo '{ "main": "hello.js", "output": "sea" }' > sea-config.json
~~~


**Problem.** v24 docs only. A developer following the single-executable tutorial on nodejs.org/docs/latest-v24.x builds and injects 'hello' / 'hello.exe' (steps 4-6), then step 7 signs and step 8 runs 'sea' / 'sea.exe', which do not exist: on macOS the required re-sign fails, on every platform the run command fails. Main is consistent.

**Check** (confirmed, Node.js v24.15.0 (Windows)). Script: [`repro/2-13.mjs`](repro/2-13.mjs).

~~~text
$ steps 1-4 for Windows exactly as in v24.22.3 (echo hello.js; echo sea-config.json; node --experimental-sea-config sea-config.json; node -e "require('fs').copyFileSync(process.execPath, 'hello.exe')"), step 6 (npx postject) skipped because it needs the network, then step 8: ./sea.exe world
Wrote single executable preparation blob to sea-prep.blob
(ls: hello.exe hello.js sea-config.json sea-prep.blob)
./sea.exe: No such file or directory
(exit 127)
~~~

Limits: postject injection and macOS codesign were not run; the failure is the file name, which does not depend on injection.

Source:

- Text only: v24.22.3 single-executable-applications.md creates the binary as hello / hello.exe on lines 63 and 69, injects into it on 109-129, then signs and runs sea / sea.exe on 137-161. Line 98 says the blob was created in step 1; it is created in step 3 (line 55).

**Suggested doc change** (v24.x):

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

### 2-14: Readable.filter, map, forEach and toArray examples destructure an array result as an object
- Page: `stream.md`, section "`readable.filter(fn[, options])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/stream.md#L2298
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/stream.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/stream.md`):

~~~text
  const { address } = await resolver.resolve4(domain, { ttl: true });
  return address.ttl > 60;
~~~


**Problem.** A developer running the asynchronous-predicate readable.filter() example in stream.md gets TypeError: Cannot read properties of undefined (reading 'ttl') on the first DNS answer; the readable.forEach() and readable.toArray() examples built the same way print undefined for every domain.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/2-14.mjs`](repro/2-14.mjs).

~~~text
$ node --import ./use-local-dns.mjs filter.mjs ; ... foreach.mjs ; ... toarray.mjs
shape check: resolve4('nodejs.org', { ttl: true }) -> [{"address":"127.0.0.1","ttl":300},{"address":"127.0.0.2","ttl":300}]

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
(exit 1 (filter), 0 (forEach, toArray: wrong output))
~~~

Source:

- lib/internal/dns/promises.js (main) :304-306 `if (ttls && this.ttl) result = ArrayPrototypeMap(result, (address, index) => ({ address, ttl: ttls[index] }));` with ttl the result is an array of objects
- doc/api/dns.md (main) :1264-1267 `When true, the Promise is resolved with an array of { address: '1.2.3.4', ttl: 60 } objects rather than an array of strings` (not linked from the stream examples)

**Suggested doc change**:

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

### 2-15: Whole-file read example joins Buffer chunks as strings
- Page: `stream.md`, section "`readable.read([size])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/stream.md#L1636
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/stream.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/stream.md`):

~~~text
readable.on('end', () => {
  const content = chunks.join('');
});
~~~


**Problem.** A developer reading a whole UTF-8 file with the 'read a file's whole contents' pattern in stream.md (readable.read()) silently gets U+FFFD replacement characters wherever a multi-byte character straddles two chunks; the default 64 KiB chunks make this hit any non-ASCII text file larger than one chunk.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/2-15.mjs`](repro/2-15.mjs).

~~~text
$ node whole_file.js
chunks: 2 65536 + 32 bytes
equal to file contents: false
U+FFFD count: 3
around boundary: "aa\ufffd\ufffd\ufffd and mo"
Buffer.concat(chunks).toString("utf8") equal: true
(exit 0)
~~~

Source:

- lib/buffer.js (main) :981-983 `Buffer.prototype.toString = function toString(encoding, start, end) { if (arguments.length === 0) { return utf8Slice(this, 0, this.length); }` Array.prototype.join converts each Buffer with toString(), decoding every chunk as UTF-8 on its own, so a character split across chunks becomes replacement characters

**Suggested doc change**:

~~~diff
 readable.on('end', () => {
-  const content = chunks.join('');
+  const content = Buffer.concat(chunks).toString('utf8');
 });

or call `readable.setEncoding('utf8')` before reading, so that the chunks are strings decoded across chunk boundaries, and keep `chunks.join('')`.
~~~

### 2-16: stream/iter duplex() echo example reads the wrong end of the pair
- Page: `stream_iter.md`, section "`duplex([options])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/stream_iter.md#L970
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/stream_iter.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: fixed
- **Fixed on main only**

Current text (v24.22.3, `doc/api/stream_iter.md`):

~~~text
console.log(await text(server.readable)); // handled by echo
~~~

Current text (main, `doc/api/stream_iter.md`):

~~~text
console.log(await text(client.readable)); // 'hello'
~~~


**Problem.** v24 docs only (API behind --experimental-stream-iter, added v24.20.0). A developer running the duplex() echo example reads server.readable, which carries the client's own writes and is already being consumed by the echo loop; the echo goes to client.readable, which the example never reads, and server.writer is never ended, so a client that does read client.readable waits forever. Main is fixed.

**Check** (confirmed by source, Node.js v24.15.0 (API absent); source read at tag v24.22.3). Script: [`repro/2-16.mjs`](repro/2-16.mjs).

~~~text
$ not run: the installed Node.js v24.15.0 predates node:stream/iter (added v24.20.0)
node --experimental-stream-iter -e "require('node:stream/iter')" -> bad option: --experimental-stream-iter
(exit 9)
~~~

Source:

- lib/internal/streams/iter/duplex.js (v24.22.3) :42-47 `// Channel A writes to B's readable (A->B direction). const { writer: aWriter, readable: bReadable } = push(...)`
- lib/internal/streams/iter/duplex.js (v24.22.3) :49-56 `// Channel B writes to A's readable ... const { writer: bWriter, readable: aReadable } = push(...); const channelA = createDuplexChannel(aWriter, aReadable); const channelB = createDuplexChannel(bWriter, bReadable);` so server.writer (bWriter) feeds client.readable (aReadable), and server.readable (bReadable) carries the client's writes
- lib/internal/streams/iter/duplex.js (v24.22.3) :78-80 `// A push readable has one shared consumer state.` text(server.readable) competes with the echo loop for the same queue
- doc/api/stream_iter.md (v24.22.3) :855 the page itself says each channel's writer feeds 'the other channel's readable'

**Suggested doc change** (as on main):

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

### 2-19: TLS setup commands produce PKCS#12 files that the samples read as PEM, and the two samples overwrite each other's files
- Page: `tls.md`, section "`tls.createServer([options][, secureConnectionListener])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/tls.md#L2380
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/tls.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/tls.md`):

~~~text
openssl pkcs12 -certpbe AES-256-CBC -export -out client-cert.pem \
  -inkey server-key.pem -in server-cert.pem
~~~


**Problem.** A developer setting up the tls.createServer() echo server and the tls.connect() client that the page says to test it with: each section's second openssl command writes a PKCS#12 (binary) file under a .pem name that the other example reads as a PEM certificate, overwriting that example's own file. Whichever side's files are generated last, the other side fails at startup with 'PEM routines::no start line'; on its own, the server silently loads no client CA from the PKCS#12 file.

**Check** (confirmed, Node.js v24.15.0, OpenSSL 3.5.5 CLI (Git for Windows)). Script: [`repro/2-19.mjs`](repro/2-19.mjs).

~~~text
$ order A: server-section commands, then client-section commands, then node -r ../loopback-only.cjs server.mjs and echo hi | node client.mjs; order B: client-section commands first, then server-section commands
server_only (server section alone): client-cert.pem first bytes 30 82 09 df 02 01 03 ... (DER PKCS#12, no 'BEGIN' line); server starts ('server bound') with that file as ca, no error.

order A: server-cert.pem is PKCS#12 -> server:
  node:internal/tls/secure-context:70
      context.setCert(cert);
  Error: error:0480006C:PEM routines::no start line
  (client then gets ECONNREFUSED)

order B: client-cert.pem is PKCS#12 -> client:
  node:internal/tls/secure-context:70
      context.setCert(cert);
  Error: error:0480006C:PEM routines::no start line
  client exit=1

control (two plain PEM pairs from the req commands only): client 'client connected authorized', 'welcome!', echo 'hi'; server 'server connected authorized'
(exit 1 (failing side in both orders))
~~~

Source:

- lib/internal/tls/secure-context.js (main) :68-73 `function setCerts(context, certs, name) { ... context.setCert(cert); }` cert must be PEM; a PKCS#12 blob is rejected with 'no start line'
- lib/internal/tls/secure-context.js (main) :61-66 `function addCACerts(...) { ... context.addCACert(cert); }` a PKCS#12 blob given as ca raised no error in the test and added no usable CA
- lib/internal/tls/secure-context.js (main) :300-312 PKCS#12 input is consumed only through the pfx option (`context.loadPKCS12(toBuf(pfx), toBuf(passphrase))`)

**Suggested doc change**: drop the `openssl pkcs12` steps and generate one PEM key pair per side, used by both examples.:

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

### 2-20: Custom test reporter never completes the transform for event types it does not list
- Page: `test.md`, section "Custom reporters"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/test.md#L1514
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/test.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/test.md`):

~~~text
      case 'test:dequeue':
        callback(null, `test ${event.data.name} dequeued`);
~~~


**Problem.** A developer who uses the stream.Transform custom reporter from test.md (ESM and CJS) sees output stop at the first event type the switch does not list (test:complete, emitted for every test): no 'started', 'passed' or 'failed' lines are ever printed, and a failing run shows no failure, only exit code 1.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/2-20.mjs`](repro/2-20.mjs).

~~~text
$ node --test --test-reporter=./reporter.mjs sample.test.mjs
test sample.test.mjs enqueuedtest sample.test.mjs dequeuedtest a enqueuedtest a dequeuedtest b enqueuedtest c enqueued
(exit 0; nothing after this point)

failing.test.mjs with the same reporter:
test failing.test.mjs enqueuedtest failing.test.mjs dequeuedtest a enqueuedtest a dequeued
(exit 1, no 'failed' line)

event order (types.mjs): ... test:enqueue c, test:complete a, test:start a, test:pass a ... (the first unlisted type is test:complete)

control with `default: callback();`: ... test a startedtest a passedtest b dequeuedtest b startedtest b passed ... test plantests 3suites 0pass 3fail 0 ...
(exit 0 (passing run, output truncated), 1 (failing run, failure not reported))
~~~

Source:

- lib/internal/streams/transform.js (main) :164-193 `Transform.prototype._write` passes the user's callback into _transform; the writable side only proceeds when that callback is invoked, so an event for which transform() never calls callback blocks every later event
- doc/api/test.md (main) :3802 documents Event 'test:complete'; also :3967 'test:interrupted', :3995 'test:log', :4148 'test:summary', none of which the sample handles

**Suggested doc change** (both the ESM and CJS variants):

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

The generator-based example is not affected (an unlisted event just yields nothing). The same symptom was reported in #48894.
~~~

### 2-21: KmacParams documents its algorithm member as 'algorithm' while every sibling class uses 'name'
- Page: `webcrypto.md`, section "`kmacParams.algorithm`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/webcrypto.md#L2449
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/webcrypto.html
- Rating: MEDIUM → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/webcrypto.md`):

~~~text
#### `kmacParams.algorithm`
~~~


**Problem.** A developer who builds the KmacParams object for subtle.sign()/subtle.verify() from webcrypto.md (members algorithm, outputLength, customization) gets TypeError: ... 'name' is required in 'Algorithm' on every call; the member is actually `name`, as in every other params class on the page.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/2-21.mjs`](repro/2-21.mjs).

~~~text
$ node kmac.mjs
ExperimentalWarning: The KMAC128 Web Crypto API algorithm is an experimental feature ...
generateKey({ name: "KMAC128" }) -> { name: 'KMAC128', length: 128 }
sign/verify documented { algorithm: "KMAC128", outputLength: 256 }: TypeError: Failed to normalize algorithm: passed algorithm can not be converted to 'Algorithm' because 'name' is required in 'Algorithm'.
sign/verify { name: "KMAC128", outputLength: 256 }: 32 bytes, verify=true
(exit 0)
~~~

Source:

- lib/internal/crypto/webidl.js (main) :128-134 `const dictAlgorithm = [ { key: 'name', converter: converters.DOMString, required: true } ];`
- lib/internal/crypto/webidl.js (main) :789-810 `converters.KmacParams = createAlgorithmDictionaryConverter('KmacParams', [ dictAlgorithm, [ { key: 'outputLength', ... required: true }, { key: 'customization', ... } ] ]);` no `algorithm` key
- doc/api/webcrypto.md (main): kmacParams.algorithm (:2449) is the only `<x>Params.algorithm` heading; 24 sibling classes document `<x>.name`, including kmacImportParams.name (:2378) and kmacKeyGenParams.name (:2429)

**Suggested doc change**:

~~~diff
-#### `kmacParams.algorithm`
+#### `kmacParams.name`

(the anchor becomes #kmacparamsname; check for links to #kmacparamsalgorithm).
~~~

### 2-29: Mocked-timer interval example asserts values the iterator does not yield
- Page: `test.md`, section "Working with Node.js timers modules"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/test.md#L3448
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/test.html
- Rating: LOW → MEDIUM
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/test.md`):

~~~text
    assert.strictEqual(timeResults[it - 1], startedAt + (interval * it));
~~~


**Problem.** A developer running the mocked timers/promises setInterval example in test.md (Mocking timers, 'Working with Node.js timers modules') gets a failing test on the first comparison, every run: the iterator yields the value passed to setInterval() (startedAt) on each tick, not startedAt + interval * n.

**Check** (confirmed, Node.js v24.15.0). Script: [`repro/2-29.mjs`](repro/2-29.mjs).

~~~text
$ node --test interval.test.mjs
✖ should tick five times testing a real use case
ℹ pass 0
ℹ fail 1
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected
+ 1794827950930
- 1794827951930
(exit 1)
~~~

Control:

~~~text
$ node --test interval_fixed.test.mjs
✔ should tick three times testing a real use case
ℹ pass 1
ℹ fail 0 (exit 0)
~~~

Source:

- lib/internal/test_runner/mock/mock_timers.js (main) :458 `async * #setIntervalPromisified(interval, result, options) {` ... :482-484 `for await (const event of eventIt) { yield result; }` the mocked iterator yields the same `result` (the value argument) on every tick, matching timersPromises.setInterval([delay[, value]]) in doc/api/timers.md

**Suggested doc change** (both variants):

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

## Lower-severity findings still present (32)

These are Low or Info on today's docs. Several are hardening points in demo samples rather than documentation errors; they are listed so that the record is complete.

### 1-2: Http2 secure server timeout default contradicts the rest of the page
- Page: `http2.md`, section "`server.setTimeout([msecs][, callback])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/http2.md#L2799
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/http2.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/http2.md`):

~~~text
* `msecs` {number} **Default:** `120000` (2 minutes)
~~~


**Problem.** Http2 secure server timeout default contradicts the rest of the page. Http2SecureServer.setTimeout() says 120000; server.timeout on the same page and the v13 changelog say 0. The implementation sets this.timeout = 0 (lib/internal/http2/core.js). Correct value is on the same page.

**Suggested doc change.** State 0 (no timeout) in both setTimeout entries.

### 1-10: traceCallback example uses names that are never defined
- Page: `diagnostics_channel.md`, section "`tracingChannel.traceCallback(fn[, position[, context[, thisArg[, ...args]]]])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/diagnostics_channel.md#L1075
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/diagnostics_channel.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/diagnostics_channel.md`):

~~~text
}, thisArg, arg1, callback);
~~~


**Problem.** traceCallback example uses names that are never defined. Skeleton call; the signature tracingChannel.traceCallback(fn, position, context, thisArg, ...args) is documented correctly just above.

Would be Medium if the block is read as a runnable program: it has its own import and throws ReferenceError (thisArg) on every run.

**Suggested doc change.** Declare the values or pass literals, for example traceCallback(fn, 1, ctx, undefined, 'arg', (err, res) => {}).

### 1-11: Wasm import example names index.js but runs index.mjs
- Page: `esm.md`, section "Wasm Instance Phase Imports"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/esm.md#L856
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/esm.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/esm.md`):

~~~text
For example, an `index.js` containing:
~~~


**Problem.** Wasm import example names index.js but runs index.mjs. Prose names index.js, the command runs node index.mjs; the right name is visible in the same block and the failure is loud (module not found).

**Suggested doc change.** Use one file name in the prose and the command.

### 1-12: Proxy examples pass a callback to fetch()
- Page: `http.md`, section "Example"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/http.md#L4842
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/http.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/http.md`):

~~~text
fetch('https://www.example.com', (res) => {
~~~


**Problem.** Proxy examples pass a callback to fetch(). fetch() takes (input, init); the arrow function is ignored as init. The request is still proxied, so nothing fails; misleading only. Repeated 4 times.

**Suggested doc change.** Show const res = await fetch('https://www.example.com');

### 1-13: Environment-file page claims a file can be sourced by a shell
- Page: `environment_variables.md`, section "`export` prefixes"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/environment_variables.md#L131
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/environment_variables.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/environment_variables.md`):

~~~text
export MY_VAR = my variable
~~~


**Problem.** Environment-file page claims a file can be sourced by a shell. 'can be sourced, without modifications, in shell terminals' is false for the page's own example: sh rejects 'export MY_VAR = my variable'. Incidental to Node's own parsing.

**Suggested doc change.** Show export MY_VAR='my variable' or note that Node accepts forms a shell does not.

### 1-14: keepAliveTimeout default stated twice with different values
- Page: `http.md`, section "`http.createServer([options][, requestListener])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/http.md#L2016
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/http.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: fixed
- **Fixed on main only**

Current text (v24.22.3, `doc/api/http.md`):

~~~text
    See [`server.keepAliveTimeout`][] for more information.
    **Default:** `65000`.
~~~

Current text (main, `doc/api/http.md`):

~~~text
* Type: {number} Timeout in milliseconds. **Default:** `65000` (65 seconds).
~~~


**Problem.** keepAliveTimeout default stated twice with different values. v24 code sets keepAliveTimeout = 5_000 when the option is absent (lib/_http_server.js:562 at v24.22.1), so the createServer '65000' is wrong for v24; server.keepAliveTimeout on the same page says 5000 correctly.

**Suggested doc change.** State one default in both places.

### 1-16: File-handle sample closes a handle that may be undefined
- Page: `fs.md`, section "File descriptors"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/fs.md#L9608
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/fs.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/fs.md`):

~~~text
} finally {
  await file.close();
}
~~~


**Problem.** File-handle sample closes a handle that may be undefined. Only when open() rejects: the finally then throws TypeError and hides the original error. Error path only.

**Suggested doc change.** Use await file?.close();

### 2-1: HTTP server sample echoes a parse error without setting a content type
- Page: `stream.md`, section "API for stream consumers"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/stream.md#L439
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/stream.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/stream.md`):

~~~text
return res.end(`error: ${er.message}`);
~~~


**Problem.** HTTP server sample echoes a parse error without setting a content type. Hardening of a demo (no Content-Type on a reflected parse error).

**Suggested doc change.** Set Content-Type: text/plain; charset=utf-8 and X-Content-Type-Options: nosniff before writing the message, or return a fixed message.

### 2-3: Legacy URL escaping example names the wrong encoding for the slash
- Page: `url.md`, section "Legacy API"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/url.md#L2043
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/url.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/url.md`):

~~~text
forward slash (`/`) character is encoded as `%3C`.
~~~


**Problem.** Legacy URL escaping example names the wrong encoding for the slash. %3C is '<'; '/' is not in the escaped set listed just above. A false sentence, the list beside it is correct.

**Suggested doc change.** Replace the example with a character that is in the listed set (for instance < becomes %3C) or delete the slash sentence.

### 2-4: Handle-scope loop sample leaves the scope open on its error exit
- Page: `n-api.md`, section "Making handle lifespan shorter than that of the native method"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L1582
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/n-api.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/n-api.md`):

~~~text
  napi_status status = napi_open_handle_scope(env, &scope);
~~~


**Problem.** Handle-scope loop sample leaves the scope open on its error exit. The break after a failed napi_get_element skips napi_close_handle_scope; error path only.

**Suggested doc change.** Close the scope before each break or move the close into a common exit path.

### 2-11: REPL examples open an unauthenticated code-execution socket on every interface
- Page: `repl.md`, section "Starting multiple REPL instances in the same process"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/repl.md#L900
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/repl.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/repl.md`):

~~~text
}).listen(5001);
~~~


**Problem.** REPL examples open an unauthenticated code-execution socket on every interface. Network REPL samples listen on all interfaces; design/hardening point.

**Suggested doc change.** Bind the examples to 127.0.0.1 or to a Unix socket in a private directory, and put the same production warning next to each network REPL example.

### 2-18: Microtask-queue fix snippet uses names the example does not define
- Page: `vm.md`, section "When `microtaskMode` is `'afterEvaluate'`, beware sharing Promises between Contexts"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/vm.md#L2342
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/vm.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/vm.md`):

~~~text
  vm.runInContext('', context);
~~~


**Problem.** Microtask-queue fix snippet uses names the example does not define. The fix snippet uses vm and context; the example it fixes imports runInContext and names inner_context. Fragment to merge by hand.

**Suggested doc change.** Write runInContext('', inner_context) and show the snippet inside the complete example.

### 2-22: TLS client example turns hostname verification off
- Page: `tls.md`, section "`tls.connect(options[, callback])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/tls.md#L1888
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/tls.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/tls.md`):

~~~text
  checkServerIdentity: () => { return null; },
~~~


**Problem.** TLS client example turns hostname verification off. Disables hostname check in a localhost demo with a pinned ca; hardening.

**Suggested doc change.** Remove the override from the sample, or show it wrapping tls.checkServerIdentity and say it is for local demos only.

### 2-23: TLS session-resumption sample stores sessions in an object that is never pruned
- Page: `tls.md`, section "Event: `'resumeSession'`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/tls.md#L745
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/tls.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/tls.md`):

~~~text
const tlsSessionStore = {};
~~~


**Problem.** TLS session-resumption sample stores sessions in an object that is never pruned. Unbounded illustrative store; hardening.

**Suggested doc change.** Show a store with expiry or a size bound, or label the object as illustrative only.

### 2-24: BlockList.PRIVATE_RANGES is described as covering all non-routable ranges
- Page: `net.md`, section "`BlockList.PRIVATE_RANGES`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/net.md#L265
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/net.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/net.md`):

~~~text
populate a blocklist with all non-routable address ranges.
~~~


**Problem.** BlockList.PRIVATE_RANGES is described as covering all non-routable ranges. The exact list is printed right below the sentence.

Would be Medium if readers use PRIVATE_RANGES as a complete SSRF denylist: 0.0.0.0/8, 100.64.0.0/10 and :: are not in it, so the 'all non-routable' claim would be a false security statement.

**Suggested doc change.** Reword to 'the RFC 1918, loopback and link-local ranges listed below' and note that it is not a complete denylist.

### 2-26: Windows build step installs a deprecated package
- Page: `n-api.md`, section "Building"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L183
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/n-api.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/n-api.md`):

~~~text
npm install --global windows-build-tools
~~~


**Problem.** Windows build step installs a deprecated package. Deprecated package recommended.

Would be Medium if the package no longer installs on current Windows with Node 24 (not checked here).

**Suggested doc change.** Point to the Visual Studio Build Tools workload or the Node.js installer's optional tools.

### 2-27: Key-derivation sample defaults to 1000 PBKDF2 iterations
- Page: `webcrypto.md`, section "Deriving bits and keys"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/webcrypto.md#L404
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/webcrypto.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/webcrypto.md`):

~~~text
async function pbkdf2(pass, salt, iterations = 1000, length = 256) {
~~~


**Problem.** Key-derivation sample defaults to 1000 PBKDF2 iterations. Weak default iteration count in a sample; hardening.

**Suggested doc change.** Raise the default to current guidance or remove it so callers must choose, with a note on cost.

### 2-28: addAbortSignal examples use names that are never imported
- Page: `stream.md`, section "`stream.addAbortSignal(signal, stream)`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/stream.md#L3597
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/stream.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/stream.md`):

~~~text
const read = addAbortSignal(
  controller.signal,
~~~


**Problem.** addAbortSignal examples use names that are never imported. Missing imports in fragments; the section makes intent clear.

**Suggested doc change.** Add the require or import lines to each sample.

### 2-33: Parameter description gives the wrong unit for a UTF-8 string length
- Page: `n-api.md`, section "`node_api_create_property_key_utf8`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L3361
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/n-api.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/n-api.md`):

~~~text
* `[in] length`: The length of the string in two-byte code units, or
~~~


**Problem.** Parameter description gives the wrong unit for a UTF-8 string length. Copy-paste from the UTF-16 variant; for UTF-8 the unit is bytes.

Would be Medium if callers pass UTF-16 counts for non-ASCII keys: node_api_create_property_key_utf8 then reads too few bytes and creates a truncated key.

**Suggested doc change.** Say 'length of the string in bytes'.

### 2-34: Stream consumer example prints 76 bytes for a 27-byte payload
- Page: `webstreams.md`, section "`streamConsumers.arrayBuffer(stream)`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/webstreams.md#L1644
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/webstreams.html
- Rating: INFO → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/webstreams.md`):

~~~text
// Prints: from readable: 76
~~~


**Problem.** Stream consumer example prints 76 bytes for a 27-byte payload. Checked locally: Readable.from(Uint8Array) yields numbers, arrayBuffer() gets 76 bytes of decimal digits ('104101108...') for a 27-byte payload. The printed 76 is accurate, but the sample teaches a pattern that corrupts bytes; the sibling examples on the same page show 27.

**Suggested doc change.** Use Readable.from([dataArray]) or a Buffer and print 27.

### 2-35: Embedded-addon sample writes to a predictable shared path and loads it
- Page: `single-executable-applications.md`, section "Using native addons in the injected main script"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/single-executable-applications.md#L677
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/single-executable-applications.html
- Rating: LOW → LOW
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/single-executable-applications.md`):

~~~text
const addonPath = path.join(os.tmpdir(), 'myaddon.node');
~~~


**Problem.** Embedded-addon sample writes to a predictable shared path and loads it. Fixed path in shared tmp loaded as native code; needs a hostile local user. Hardening.

**Suggested doc change.** Create a private directory with fs.mkdtempSync and write the addon there.

### 1-1: Server sample answers with a request value and no content type
- Page: `async_hooks.md`, section "`async_hooks.executionAsyncResource()`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/async_hooks.md#L725
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/async_hooks.html
- Rating: INFO → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/async_hooks.md`):

~~~text
res.end(JSON.stringify(executionAsyncResource()[sym]));
~~~


**Problem.** Server sample answers with a request value and no content type. Hardening suggestion for a demo; JSON-encoded, not shown exploitable.

**Suggested doc change.** Add res.setHeader('Content-Type', 'application/json') and X-Content-Type-Options: nosniff to both copies of the sample.

### 1-4: Stray semicolon in an event heading
- Page: `inspector.md`, section "Event: `<inspector-protocol-method>`;"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/inspector.md#L262
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/inspector.html
- Rating: INFO → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/inspector.md`):

~~~text
#### Event: `<inspector-protocol-method>`;
~~~


**Problem.** Stray semicolon in an event heading. Stray ';' in a heading; the promise-API copy at line 82 has none.

**Suggested doc change.** Remove the trailing semicolon.

### 1-15: crypto.verify gives the wrong default PSS salt length
- Page: `crypto.md`, section "`crypto.verify(algorithm, data, key, signature[, callback])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/crypto.md#L7379
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/crypto.html
- Rating: LOW → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/crypto.md`):

~~~text
size, `crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN` (default) sets it to the
~~~


**Problem.** crypto.verify gives the wrong default PSS salt length. Text unchanged, but no wrong result: RSA_PSS_SALTLEN_MAX_SIGN === RSA_PSS_SALTLEN_AUTO === -2 (checked locally), so verify auto-detects either way; a PSS signature with saltLength 20 verifies with the default (checked). Only the wording ('sets it to the maximum permissible value') describes signing, not verifying.

**Suggested doc change.** State RSA_PSS_SALTLEN_AUTO as the default in crypto.verify.

### 2-2: URL-building sample trusts forwarded-host headers
- Page: `url.md`, section "`url.parse(urlString[, parseQueryString[, slashesDenoteHost]])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/url.md#L1936
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/url.html
- Rating: INFO → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/url.md`):

~~~text
const host = req.headers['x-forwarded-host'] || req.headers.host || 'example.com';
~~~


**Problem.** URL-building sample trusts forwarded-host headers. The following paragraph states the reverse-proxy assumption and gives the safe variant.

**Suggested doc change.** Take the host from configuration or an allowlist in the sample, and show the forwarded-header form only next to a check of the scheme and host values.

### 2-5: HTTP server sample buffers the whole request body with no size limit
- Page: `stream.md`, section "API for stream consumers"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/stream.md#L425
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/stream.html
- Rating: INFO → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/stream.md`):

~~~text
  req.on('data', (chunk) => {
    body += chunk;
  });
~~~


**Problem.** HTTP server sample buffers the whole request body with no size limit. No body-size cap in a teaching sample.

**Suggested doc change.** Track the received length, answer 413 and destroy the request past a limit, and say in the text that the sample has no cap.

### 2-6: Streamed decompression sample has no output cap
- Page: `zlib.md`, section "Compressing HTTP requests and responses"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/zlib.md#L300
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/zlib.html
- Rating: INFO → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/zlib.md`):

~~~text
pipeline(response, zlib.createBrotliDecompress(), output, onError);
~~~


**Problem.** Streamed decompression sample has no output cap. No decompressed-size cap in a client sample.

**Suggested doc change.** Show a counting transform that aborts the pipeline past a limit, or state that the sample is unbounded.

### 2-7: Header-parsing sample grows its buffer without a limit
- Page: `stream.md`, section "`readable.unshift(chunk[, encoding])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/stream.md#L1935
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/stream.html
- Rating: INFO → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/stream.md`):

~~~text
      header += str;
~~~


**Problem.** Header-parsing sample grows its buffer without a limit. Unbounded header buffer in an unshift() demo.

**Suggested doc change.** Cap the header length, call the callback with an error and destroy the stream when no delimiter is found within the cap.

### 2-8: Example writes helper files into the script directory without checking for existing files
- Page: `vm.md`, section "When `importModuleDynamically` is `vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/vm.md#L2425
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/vm.html
- Rating: INFO → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/vm.md`):

~~~text
'export const filename = "./test.json";');
~~~


**Problem.** Example writes helper files into the script directory without checking for existing files. Demo writes helper files next to itself.

**Suggested doc change.** Write the helper files into a fresh directory from fs.mkdtempSync, or use the wx flag.

### 2-25: Native API signature uses a finalizer type that the page never defines
- Page: `n-api.md`, section "`node_api_create_external_sharedarraybuffer`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L2591
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/n-api.html
- Rating: LOW → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/n-api.md`):

~~~text
node_api_noenv_finalize finalize_cb,
~~~


**Problem.** Native API signature uses a finalizer type that the page never defines. The type exists in the real header (src/js_native_api_types.h:180 at v24.22.1), so copying the signature compiles; only the page does not define it. The audit's raise condition is false.

**Suggested doc change.** Define the type or use a documented one.

### 2-31: Malformed typedef in the error-info structure listing
- Page: `n-api.md`, section "Return values"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/n-api.md#L1075
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/n-api.html
- Rating: LOW → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/n-api.md`):

~~~text
typedef struct napi_extended_error_info {
~~~


**Problem.** Malformed typedef in the error-info structure listing. A structure-layout listing; the real header uses 'typedef struct {...} napi_extended_error_info;' (src/js_native_api_types.h:197). Nobody compiles the listing.

**Suggested doc change.** End the declaration with } napi_extended_error_info;.

### 2-32: package.json samples start with a // comment line
- Page: `packages.md`, section "Targets must be relative URLs"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/packages.md#L487
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/packages.html
- Rating: INFO → INFO
- Status: still present in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/packages.md`):

~~~text
// package.json
{
  "name": "my-package",
~~~


**Problem.** package.json samples start with a // comment line. A file-name comment inside a json block.

**Suggested doc change.** Move the file name into the code fence label or a heading.

## Withdrawn: wrong at audit (2)

On re-reading v24.22.1 and its source, these findings do not hold. They are withdrawn.

### 1-3: Minimum for maxHeaderListPairs differs between the three option lists
- Page: `http2.md`, section "`http2.connect(authority[, options][, listener])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/http2.md#L3373
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/http2.html
- Rating: LOW → not rated
- Status: wrong at audit in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/http2.md`):

~~~text
[`request.maxHeadersCount`][] in the `node:http` module. The minimum value
    is `1`. **Default:** `128`.
~~~


**Reason for withdrawal.** Server minimum 4 and client (http2.connect) minimum 1 are both what the code enforces (src/node_http_common-inl.h:71-79); the lists are correct per entry point.

### 2-17: Dependency-timing examples print 'undefined' as the module name
- Page: `perf_hooks.md`, section "Measuring how long it takes to load dependencies"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/perf_hooks.md#L3307
- Rendered v24 page: https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html
- Rating: MEDIUM → not rated
- Status: wrong at audit in v24.22.3; on main: still present

Current text (v24.22.3, `doc/api/perf_hooks.md`):

~~~text
    console.log(`import('${entry[0]}')`, entry.duration);
~~~


**Reason for withdrawal.** timerify sets entry[n] = args[n] (lib/internal/perf/timerify.js:49-50), so entry[0] is the module name; checked locally.

## Could not check (1)

### 2-30: quic.listen() example omits the sni option the page calls required
- Page: `quic.md`, section "`quic.listen(onsession[, options])`"
- Source on main: https://github.com/nodejs/node/blob/main/doc/api/quic.md#L532
- Rendered v24 page: not published (`quic.html` returns 404 in the v24 HTML docs)
- Rating: LOW → not rated
- Status: cannot check in v24.22.3; on main: still present

Current text (main, `doc/api/quic.md`):

~~~text
const endpoint = await listen((session) => {
~~~


**Why.** 

## About nodejs/node#67509

The findings were first posted on 16 November 2026 as one issue, [nodejs/node#67509](https://github.com/nodejs/node/issues/67509). From the issue's public timeline:

- 08:11:51 UTC: the issue was opened. The account owner opened it by hand through the GitHub web form.
- 10:37:26 UTC: a project member added the label `invalid`.
- 10:37:37 UTC: the issue was closed as not planned.
- 10:52:29 UTC: the member commented that Node.js does not allow automated posting of issues or advertising of services and regards this as spam, quoting the Moderation Policy.
- 10:52:34 UTC: the conversation was locked with the reason "spam".

No comment in the thread addressed the content of the findings. The original issue described its source as an audit service and linked to it. This re-report removes that wording: the issue text in `ISSUE_COPY.md` gives each problem with its quote, its reproduction and a suggested change, and names the source of the findings in one line.

The re-report was posted on 16 November 2026 as [nodejs/node#67518](https://github.com/nodejs/node/issues/67518). A copy of its text is kept in this repository as ISSUE_COPY.md, so the record stays available whatever happens there.

## Reproducing

Each file in [`repro/`](repro/) reproduces one Medium finding: `node repro/<id>.mjs`. The header of each file says what it needs and what wrong result to expect. The scripts write their fixtures into a fresh temporary directory and remove it afterwards. Network use is limited to localhost.

## Licence

Text: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), © 2026 Ondrej Dvorak, Pukapasoft. Reproduction scripts in `repro/`: MIT. The scripts embed examples copied from the Node.js documentation, which is MIT-licensed (Copyright Node.js contributors).
