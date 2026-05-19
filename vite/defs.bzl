"""Public rules for rules_vite."""

load("@aspect_rules_js//js:defs.bzl", "js_test")

def vitest_test(
        name,
        srcs,
        config = None,
        deps = None,
        data = None,
        env = None,
        tags = None,
        timeout = "moderate",
        **kwargs):
    """Run vitest against the given test sources under a hermetic Bazel sandbox.

    The consumer must call `npm_link_all_packages(name = "node_modules")` at
    the top of its `BUILD.bazel` and include `:node_modules/vitest` in
    `deps` (plus any test-time npm packages the suite imports). The
    launcher resolves vitest via Node's standard walk-up from
    `chdir = package_name()`.

    Args:
      name: Test target name.
      srcs: Test source files (typically `glob(["**/*.test.ts"])`).
      config: Optional vitest config file (a `js_library` target wrapping
        the .ts/.js config). If omitted, vitest runs with its default
        config — fine for simple test suites; richer suites pass a config
        and add its transitive deps to `deps`.
      deps: Runtime deps the test sources need (their `:lib`, the npm-linked
        vitest binary `:node_modules/vitest`, any npm packages the tests
        import).
      data: Extra runtime files.
      env: Extra env vars passed to vitest. `VITEST_CONFIG` is set
        automatically when `config` is non-empty.
      tags: Bazel tags. The macro doesn't add any tags of its own —
        consumers tag for their own CI matrix.
      timeout: Bazel test timeout (default `moderate` = 5min).
      **kwargs: Forwarded to `js_test`.
    """
    final_env = dict(env or {})
    extra_data = []
    if config:
        final_env["VITEST_CONFIG"] = "$(rootpath %s)" % config
        extra_data.append(config)

    js_test(
        name = name,
        entry_point = "@rules_vite//vite:launcher",
        chdir = native.package_name(),
        args = ["$(rootpath %s)" % s for s in srcs],
        data = (deps or []) + (data or []) + srcs + extra_data,
        env = final_env,
        tags = tags,
        timeout = timeout,
        **kwargs
    )
