<!-- Generated with Stardoc: http://skydoc.bazel.build -->

Public rules for rules_vite.

<a id="vitest_test"></a>

## vitest_test

<pre>
load("@rules_vite//vite:defs.bzl", "vitest_test")

vitest_test(<a href="#vitest_test-name">name</a>, <a href="#vitest_test-srcs">srcs</a>, <a href="#vitest_test-config">config</a>, <a href="#vitest_test-deps">deps</a>, <a href="#vitest_test-data">data</a>, <a href="#vitest_test-env">env</a>, <a href="#vitest_test-tags">tags</a>, <a href="#vitest_test-timeout">timeout</a>, <a href="#vitest_test-kwargs">**kwargs</a>)
</pre>

Run vitest against the given test sources under a hermetic Bazel sandbox.

The consumer must call `npm_link_all_packages(name = "node_modules")` at
the top of its `BUILD.bazel` and include `:node_modules/vitest` in
`deps` (plus any test-time npm packages the suite imports). The
launcher resolves vitest via Node's standard walk-up from
`chdir = package_name()`.


**PARAMETERS**


| Name  | Description | Default Value |
| :------------- | :------------- | :------------- |
| <a id="vitest_test-name"></a>name |  Test target name.   |  none |
| <a id="vitest_test-srcs"></a>srcs |  Test source files (typically `glob(["**/*.test.ts"])`).   |  none |
| <a id="vitest_test-config"></a>config |  Optional vitest config file (a `js_library` target wrapping the .ts/.js config). If omitted, vitest runs with its default config — fine for simple test suites; richer suites pass a config and add its transitive deps to `deps`.   |  `None` |
| <a id="vitest_test-deps"></a>deps |  Runtime deps the test sources need (their `:lib`, the npm-linked vitest binary `:node_modules/vitest`, any npm packages the tests import).   |  `None` |
| <a id="vitest_test-data"></a>data |  Extra runtime files.   |  `None` |
| <a id="vitest_test-env"></a>env |  Extra env vars passed to vitest. `VITEST_CONFIG` is set automatically when `config` is non-empty.   |  `None` |
| <a id="vitest_test-tags"></a>tags |  Bazel tags. The macro doesn't add any tags of its own — consumers tag for their own CI matrix.   |  `None` |
| <a id="vitest_test-timeout"></a>timeout |  Bazel test timeout (default `moderate` = 5min).   |  `"moderate"` |
| <a id="vitest_test-kwargs"></a>kwargs |  Forwarded to `js_test`.   |  none |


