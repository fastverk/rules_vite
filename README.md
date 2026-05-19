# rules_vite

Bazel rules for [Vitest](https://vitest.dev/) under [aspect_rules_js](https://github.com/aspect-build/rules_js).
Wraps a vitest run as a hermetic `js_test`: the consumer's package-local
`node_modules/vitest` is resolved at runtime; the test sources are
passed explicitly via argv; the launcher rewrites runfiles-relative
paths so config and srcs survive `chdir` into the consumer's package.

- **rules**:
  - `vitest_test` — `bazel test //path:target` → runs vitest in a
    hermetic sandbox with declared inputs only. See
    [docs/defs.md](docs/defs.md).

The consumer brings its own `vitest` npm dep (so the version isn't
pinned by rules_vite). The macro doesn't impose any project key or
config shape — pass any vitest config file as `config`, or accept the
minimal default.

## Install

Add the registry to your `.bazelrc`:

```
common --registry=https://raw.githubusercontent.com/fastverk/bazel-registry/main/
common --registry=https://bcr.bazel.build/
```

In your `MODULE.bazel`:

```python
bazel_dep(name = "rules_vite", version = "0.1.0")
bazel_dep(name = "aspect_rules_js", version = "3.1.2")
bazel_dep(name = "rules_nodejs", version = "6.7.4")

node = use_extension("@rules_nodejs//nodejs:extensions.bzl", "node")
node.toolchain(node_version = "22.11.0")

npm = use_extension("@aspect_rules_js//npm:extensions.bzl", "npm")
npm.npm_translate_lock(
    name = "npm",
    pnpm_lock = "//:pnpm-lock.yaml",  # must include vitest
)
use_repo(npm, "npm")
```

## Quick start

In a `BUILD.bazel`:

```python
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_vite//vite:defs.bzl", "vitest_test")

npm_link_all_packages(name = "node_modules")

vitest_test(
    name = "test_node",
    srcs = ["foo.test.ts", "bar.test.ts"],
    deps = [
        ":node_modules/vitest",
        # ...workspace deps the tests import...
    ],
)
```

The macro:
- Sets `chdir` to the consumer's package, so `process.cwd()` puts the
  test inside `<consumer>/node_modules/...` for module resolution.
- Resolves vitest's bin via `vitest/package.json` (vitest doesn't expose
  the bin file in its `exports` map, so direct subpath resolution fails
  with `ERR_PACKAGE_PATH_NOT_EXPORTED`).
- Rewrites `VITEST_CONFIG` and argv test-source paths to absolute paths
  anchored at `$JS_BINARY__RUNFILES/_main`, so they survive `chdir`.

## Config

Pass `config` to override the default minimal config:

```python
vitest_test(
    name = "test_with_setup",
    srcs = ["foo.test.ts"],
    config = "//:vitest.config.ts",
    deps = [
        ":node_modules/vitest",
        "//:vitest.config.ts.lib",  # js_library wrapping the config
        # plus any plugins the config imports
    ],
)
```

If `config` is omitted the macro injects a minimal config that:
- Sets `environment: 'node'`
- Disables `globals`, `setupFiles`, coverage, plugins
- Lets `testTimeout` / `hookTimeout` default to vitest's settings

Tests that need richer setup (browser env, plugins, globalSetup, etc.)
provide their own config and materialize its transitive deps in
runfiles via standard `js_library` wrappers.

## Smoke test

```bash
bazel test @rules_vite//examples/smoke:...
```

Runs a real vitest invocation against a tiny pnpm workspace pinned in
[examples/smoke](examples/smoke). Used as a release gate.
