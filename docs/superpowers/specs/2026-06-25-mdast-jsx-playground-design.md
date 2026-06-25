# mdast-jsx playground - design

Date: 2026-06-25
Status: approved

## Goal

A browser-based playground for `mdast-jsx`, hosted on GitHub Pages, where you write
TSX on the left and see the generated markdown on the right (with a toggle to a
rendered preview). It demos two things the library is actually about:

1. **Type safety** against the mdast schema, live, the way it feels in an IDE.
2. **Dynamic rendering** - JSX only earns its keep when markdown is built from data
   with loops, conditionals, and components. Static markdown is a poor advertisement
   for JSX, so the playground leads with data-driven examples and shows the real
   `toMarkdown(...)` call, so users feel exactly how they'd use it.

## Background

`mdast-jsx` is a tiny JSX runtime: `jsx()` builds mdast objects, `toMarkdown()`
serializes them. The library itself is trivial; the demo's real work is the
toolchain around it - compiling TSX in the browser, executing it safely, and
surfacing type errors. The repo currently publishes a single package from the root.

The core pipeline a browser demo needs:

```
TSX source -> [compile JSX] -> JS with jsx() calls -> [execute] -> markdown string -> [render] -> preview
```

## Decisions

- **Editor:** Monaco, not CodeMirror. CodeMirror has no built-in type checking;
  Monaco ships VS Code's TS language service, giving squiggles / hover / autocomplete
  essentially for free once configured. Type safety is the whole pitch, so this is
  non-negotiable.
- **Compile:** Sucrase. Pure-JS, fast, supports `jsxRuntime: automatic` +
  `jsxImportSource`. Not tsc (heavier, unnecessary). Sucrase only transforms; it
  does not type-check (that's Monaco's job).
- **Execute: quickjs-emscripten (sandboxed).** User code runs inside a WebAssembly
  JS VM with no host bindings - no `fetch`, `document`, storage, service workers, or
  network unless explicitly injected (we inject none of those). See "Why quickjs".
- **`toMarkdown` runs inside the VM.** The editor code imports and calls
  `toMarkdown` / `gfmToMarkdown` itself, exactly like real usage, and the VM returns
  the finished markdown **string**. This keeps the demo authentic and makes the VM
  boundary trivial (a string, not a tree).
- **Module substrate: ESM end-to-end.** quickjs runs ESM natively and identically in
  Node and the browser, so user code is ESM and the core pipeline is unit-testable in
  vitest with no blob/`data:`-URL gymnastics.
- **Preview: `react-markdown` + `remark-gfm`.** Same ecosystem as the lib, renders
  real React elements (no `dangerouslySetInnerHTML`, so no preview-side XSS to reason
  about).
- **Layout:** 2-pane, right pane toggles raw markdown <-> rendered preview.
- **Repo layout:** lib stays at the root (still the published package). Playground is
  added as the single pnpm workspace member at `playground/`. This avoids any changes
  to the release pipeline (release-please / `release.yml`). Root being both the
  workspace root and a published package is mildly unconventional but common and works.
- **Framework:** React via `@monaco-editor/react`. GFM always available.

## Why quickjs (security)

The threat model hinges on one question: can attacker-supplied code run in a
visitor's browser? With v1's no-sharing scope the answer is "no" today, but
shareable URLs are the obvious next feature, and the moment they exist a crafted
link runs attacker JS on the `supabase-community.github.io` origin.

quickjs-emscripten sandboxes the JS *engine*: code in the VM has access only to what
we inject. We inject only the `jsx` runtime and the two `mdast-util-*` serializers
(all pure, no capabilities). So the VM cannot touch the DOM, storage, cookies,
service workers, or the network. This collapses the whole arbitrary-code-execution
threat surface to ~zero - including the two genuinely damaging attacks (origin
phishing and service-worker persistence) - and makes future shareable URLs safe by
construction. Runaway loops and memory blowups are bounded natively via
`runtime.setInterruptHandler(shouldInterruptAfterDeadline(...))` and
`runtime.setMemoryLimit(...)`.

The integration is unusually small here because mdast is plain data and the
serializers are pure JS: nothing exotic crosses the boundary, and the VM returns a
plain string.

## Structure

```
mdast-jsx/                  # published lib stays at root (unchanged)
  src/  dist/  package.json
  pnpm-workspace.yaml       # add packages: ["playground"] (keep minimumReleaseAge)
  playground/               # new, private package
    package.json            # depends on "mdast-jsx": "workspace:*"
    vite + react app
  .github/workflows/
    pages.yml               # new: build playground -> deploy to Pages
```

No changes to `release-please-config.json`, `.release-please-manifest.json`, or
`release.yml`. CI (`ci.yml`) gets a `pnpm --filter playground build` + test step so
the demo can't silently break.

## Two independent toolchains

These run side by side and never touch each other - one judges correctness, the
other produces output:

1. **Monaco's built-in TS language service = type checking only.** Never executes
   anything. Configured with:
   - compiler options `jsx: ReactJSX`, `jsxImportSource: "mdast-jsx"`, `strict: true`
   - **Real types** for the mdast JSX (the library's actual value prop):
     `mdast-jsx/jsx-runtime`, `@types/mdast`, `@types/unist`, loaded via
     `monaco.languages.typescript.typescriptDefaults.addExtraLib`.
   - **Lightweight ambient shims** for the serializer imports the editor code uses:
     `mdast-util-to-markdown` (`export function toMarkdown(node, options?): string`)
     and `mdast-util-gfm` (`export function gfmToMarkdown(): unknown`). This gives
     authentic, squiggle-free imports without dragging the full micromark type graph
     into Monaco.
   - The real `.d.ts` content is read from `dist/` and `node_modules` at build time
     by a small Vite plugin (so it stays in sync with the lib); the ambient shims are
     authored by hand.

   Result: `<heading>Title</heading>` shows *"Property 'depth' is missing"* live.
   This is the demo's "wow" moment.

2. **Sucrase = transform-to-run.** TSX -> ESM JS (automatic runtime,
   `jsxImportSource: mdast-jsx`). No type-checking.

## Execution pipeline (sandboxed)

```
Monaco buffer
  -> Sucrase(tsx -> ESM JS, automatic, jsxImportSource=mdast-jsx)
  -> quickjs VM (memory + interrupt limits set)
       module loader injects: mdast-jsx/jsx-runtime, mdast-util-to-markdown,
                              mdast-util-gfm  (pre-bundled ESM strings)
       evalCode(code, { type: 'module' })
  -> read `export default` (a markdown string) -> ctx.dump
  -> markdown string
```

- **What's injected into the VM:** the lib's `dist/jsx-runtime.js` (one tiny module),
  plus `mdast-util-to-markdown` and `mdast-util-gfm` each pre-bundled to a single ESM
  string at build time (esbuild). All pure JS. The module loader resolves exactly
  these specifiers and errors on anything else.
- **Authoring convention:** the editor module imports `toMarkdown` (+ `gfmToMarkdown`),
  defines a component named after the document it builds (e.g. `ClientList`,
  `ReleaseNotes` - never a generic `App`, which implies a live UI render), and ends
  with `export default toMarkdown(<ClientList />, { extensions: [gfmToMarkdown()] })`.
  This mirrors real usage exactly: a component for structure plus an explicit
  serialize step. The VM returns that markdown string. (Considered a named-const and
  a REPL-style last-expression; chose the direct default export for concision -
  the output pane is labeled so the string-valued export reads naturally.)
- **Errors:** compile errors (Sucrase), VM errors (eval/runtime), and interrupt/
  memory-limit aborts are caught and rendered in the output pane; the last good
  markdown is retained on the raw-MD tab.
- **Async:** `getQuickJS()` resolves the wasm once at startup; per-run execution is
  synchronous after that. Editor changes are debounced ~300ms.

## UI

- 2-pane layout (CSS grid; a fixed 50/50 split for v1, draggable splitter is a
  trivial later add).
- Left: Monaco editor (TSX).
- Right: toggles between **raw markdown** and a **rendered preview** (react-markdown +
  remark-gfm). Toggle is a tab/switch in the right pane header.
- A preset dropdown that **leads with dynamic examples**, since that's where JSX's
  value lands. Each preset is named after the document it builds:
  - **Release notes (default)** - groups a typed list of merged PRs into
    Features / Bug-fixes sections via `.filter` + `.map` and a reusable `Section`
    component; empty sections return `null` so their heading auto-vanishes (the
    "string concat would suck" payoff). This is the lead example.
  - **Usage table** - a data-driven GFM table from rows of JSON (alignment handled
    for you).
  - **LLM context block** - builds a markdown context/prompt from a structured
    object (an order with line items), riding the README's "agents prefer markdown"
    framing.
- React via `@monaco-editor/react`.

## Out of scope (v1)

- Shareable URLs. Deferred (YAGNI), but quickjs makes them safe whenever added.
- Multi-file editing.
- npm-package mode (always uses the workspace lib at HEAD).

## Risks / things to de-risk first

1. **quickjs spike (do first):** prove the end-to-end VM path - Sucrase output +
   injected `jsx-runtime` + injected `mdast-util-to-markdown`/`mdast-util-gfm` running
   inside quickjs and returning a correct markdown string. The one real unknown is
   whether the serializers' bundles run cleanly in quickjs (low risk - pure,
   browser-safe JS, ES2023). Use the single-file wasm variant
   (`@jitl/quickjs-singlefile-browser-release-sync`) so there's no separate `.wasm`
   fetch / MIME config to get wrong on GitHub Pages.
2. **Monaco TS config producing real mdast-jsx errors.** Getting `jsxImportSource`
   plus the real `mdast` / `unist` `.d.ts` wired so `<heading>` resolves to the
   runtime's JSX namespace, with ambient shims for the serializer imports.
3. **`@types/mdast` version skew** - the lib depends on `@types/mdast@^3`; the `.d.ts`
   fed to Monaco must match what the lib was built against (resolve via workspace
   hoisting, not a separate pin).
4. **VM perf** - injected serializer modules are re-parsed per run; debounced and
   small enough to be fine for v1. Bytecode caching is a possible later optimization.
