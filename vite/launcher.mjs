// Launcher for `vitest_test` Bazel rule. Runs vitest's CLI against the
// config + test sources passed in by the rule.
//
// Resolution model: js_test's `chdir` puts CWD at the consumer's package
// directory inside runfiles. The consumer adds `:node_modules/vitest`
// (and any other test-time npm deps) to `deps`, which makes vitest
// resolvable from that directory via Node's normal walk-up algorithm.
//
// Rule contract:
//   env.VITEST_CONFIG  — runfiles-relative path to the vitest config
//                        (optional — if unset, vitest runs with its
//                        default config)
//   argv[2..]          — test source files (rootpath-resolved)

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Anchor resolution at the consumer's package (set by `chdir` in the
// rule), not at the launcher's location in `external/rules_vite/vite/`.
// The consumer adds `:node_modules/vitest` to deps, which materializes
// `<consumer>/node_modules/vitest/...` in runfiles.
const require = createRequire(pathToFileURL(path.join(process.cwd(), 'noop.js')));

// vitest doesn't expose its bin file in package.json `exports`, so
// resolving `vitest/vitest.mjs` directly fails with
// ERR_PACKAGE_PATH_NOT_EXPORTED. Locate the package via its
// package.json (which IS exported) and join the bin path manually.
let vitestBin;
try {
    const pkgJsonPath = require.resolve('vitest/package.json');
    const pkgJson = require(pkgJsonPath);
    const binRel = typeof pkgJson.bin === 'string'
        ? pkgJson.bin
        : pkgJson.bin && pkgJson.bin.vitest;
    if (!binRel) {
        throw new Error(`vitest@${pkgJson.version}: no \`bin.vitest\` in package.json`);
    }
    vitestBin = path.resolve(path.dirname(pkgJsonPath), binRel);
} catch (err) {
    console.error(
        '[vitest_test] Could not resolve vitest CLI from ' +
            process.cwd() +
            '. Add `:node_modules/vitest` to this target\'s `deps`.',
    );
    console.error(err);
    process.exit(2);
}

// `$(rootpath …)` gives the path relative to the *runfiles root*, but
// `chdir = native.package_name()` has put cwd at `<runfiles>/<consumer>`.
// Rewrite to an absolute path off the runfiles root so vitest finds
// the config + the test sources regardless of cwd depth.
const runfilesRoot = process.env.JS_BINARY__RUNFILES
    ? path.join(process.env.JS_BINARY__RUNFILES, '_main')
    : path.resolve(process.cwd(), '..', '..');

function absifyRunfilesPath(p) {
    if (!p) return p;
    if (path.isAbsolute(p)) return p;
    return path.join(runfilesRoot, p);
}

const config = absifyRunfilesPath(process.env.VITEST_CONFIG);
const srcs = process.argv.slice(2).map(absifyRunfilesPath);

const args = [vitestBin, 'run'];
if (config) args.push('--config', config);

// ── JUnit for Bazel / GitLab CI ──────────────────────────────────────────────
// Bazel sets XML_OUTPUT_FILE for every test action and treats whatever the test
// writes there as the canonical `test.xml`. By default a `bazel test` produces a
// SYNTHETIC test.xml with one <testcase> per Bazel TARGET (the real per-test
// cases buried in <system-out>). Pointing vitest's `junit` reporter at
// XML_OUTPUT_FILE instead yields real per-test cases — which GitLab ingests via
// `artifacts:reports:junit`. Passed on the CLI (not via the config file) so it
// applies uniformly even when a target supplies its own per-dir vitest config,
// and so it's the launcher process — which always has XML_OUTPUT_FILE — that
// resolves it. `--reporter=default` keeps the console output.
const xmlOut = process.env.XML_OUTPUT_FILE;
if (xmlOut) {
    args.push('--reporter=default', '--reporter=junit', `--outputFile.junit=${xmlOut}`);
}

// ── Coverage opt-in (VITEST_COVERAGE=1) ──────────────────────────────────────
// Write a cobertura report into Bazel's per-test undeclared-outputs dir (Bazel
// zips it into testlogs/<target>/test.outputs/outputs.zip); CI extracts + merges
// the per-target reports into one cobertura.xml for GitLab's coverage_report.
// Requires the consumer to add `@vitest/coverage-v8` to the target's deps.
if (process.env.VITEST_COVERAGE === '1') {
    const covDir = process.env.TEST_UNDECLARED_OUTPUTS_DIR
        ? path.join(process.env.TEST_UNDECLARED_OUTPUTS_DIR, 'coverage')
        : 'coverage';
    args.push(
        '--coverage',
        '--coverage.provider=v8',
        '--coverage.reporter=cobertura',
        '--coverage.reporter=text-summary',
        `--coverage.reportsDirectory=${covDir}`,
    );
}

args.push(...srcs);

const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
});
