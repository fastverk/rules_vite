# Changelog

All notable changes to rules_vite. The format is loosely
[Keep a Changelog](https://keepachangelog.com/) — version headers
mirror the published bazel-registry entries.

## 0.1.0 — initial release

- Initial release of Bazel rules for [Vitest] under
  `aspect_rules_js`. Wraps a vitest run as a hermetic `js_test`: the
  consumer's package-local `node_modules/vitest` is resolved at
  runtime, test sources are passed explicitly via argv, and the
  launcher rewrites runfiles-relative paths so config + srcs survive
  the `chdir` into the consumer's package.
- Ships one rule, `vitest_test` (`bazel test //path:target`), running
  vitest in a hermetic sandbox with declared inputs only.
- The consumer brings its own `vitest` npm dep — rules_vite doesn't
  pin a version or impose a project key / config shape; pass any
  vitest config via `config` or use the minimal default.
