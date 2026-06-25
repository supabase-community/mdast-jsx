# mdast-jsx Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A GitHub Pages playground where you write TSX on the left and see the generated markdown (raw or rendered) on the right, with live mdast type-checking in the editor and dynamic, data-driven examples that show why JSX beats string concatenation.

**Architecture:** A private Vite + React app added as the single pnpm workspace member at `playground/`. Two independent toolchains: Monaco's built-in TypeScript service does type-checking only, and Sucrase transforms TSX → ESM. User code runs **inside a quickjs-emscripten WebAssembly VM** (no host bindings → fully sandboxed). The VM's module loader injects three pre-bundled pure-JS ESM modules - the lib's `jsx-runtime`, `mdast-util-to-markdown`, and `mdast-util-gfm` - so the editor code imports and calls `toMarkdown` exactly like real usage. The VM returns the finished markdown **string**, which the host displays raw or rendered via `react-markdown`.

**Tech Stack:** Vite, React, `@monaco-editor/react` + `monaco-editor`, `sucrase`, `quickjs-emscripten` + `@jitl/quickjs-singlefile-browser-release-sync`, `esbuild` (build-time VM-module bundling), `mdast-jsx` (workspace), `mdast-util-to-markdown`, `mdast-util-gfm`, `react-markdown` + `remark-gfm`, Vitest.

## Global Constraints

- **Never auto-commit.** Per the repo owner's standing rule, do NOT run `git commit`/`git push`. Each task ends by *staging* changes (`git add`); the user commits. Treat the "Stage" step as the task checkpoint.
- **Lib stays at root.** Do NOT move `src/`/`package.json` or touch `release-please-config.json`, `.release-please-manifest.json`, or `.github/workflows/release.yml`.
- **pnpm only.** Node packages prefixed `node:` in source. Prefer `??` over `||`. Concise JSDoc on exported functions.
- **Version alignment:** playground pins `mdast-util-to-markdown@^1`, `mdast-util-gfm@^2` (match the lib's devDeps); `@types/mdast@^3` resolves through hoisting (the version the lib's `.d.ts` was built against).
- **ESM end-to-end.** No CJS substrate; quickjs runs ESM natively in Node and browser.
- **Sandbox by default.** User code only ever runs inside the quickjs VM, never via `eval`/`new Function`/blob-import on the host.
- **Authoring convention:** editor code imports `toMarkdown`/`gfmToMarkdown`, defines a component named after the document, and ends with `export default toMarkdown(<Component />, { extensions: [gfmToMarkdown()] })`. The VM's default export is therefore a markdown **string**.

## File Structure

```
pnpm-workspace.yaml                      # MODIFY: add packages: ["playground"]
playground/
  package.json                           # CREATE
  tsconfig.json                          # CREATE
  vite.config.ts                         # CREATE: react + 2 virtual-module plugins + base
  vitest.config.ts                       # CREATE: node env
  index.html                             # CREATE
  src/
    main.tsx                             # CREATE: React root + quickjs init
    App.tsx                              # CREATE: layout, debounce, wiring
    App.css                              # CREATE
    vite-env.d.ts                        # CREATE: virtual module decls
    components/
      Editor.tsx                         # CREATE: Monaco + TS wiring
      OutputPane.tsx                     # CREATE: raw MD <-> react-markdown toggle
    lib/
      vm-modules.ts                      # CREATE: buildVmModules() (esbuild bundles)
      vm-modules.test.ts                 # CREATE
      run-tsx.ts                         # CREATE: Sucrase + quickjs -> md string
      run-tsx.test.ts                    # CREATE
      type-defs.ts                       # CREATE: collectTypeDefs() (real + ambient)
      type-defs.test.ts                  # CREATE
    plugins/
      vite-plugin-vm-modules.ts          # CREATE: virtual:vm-modules
      vite-plugin-type-defs.ts           # CREATE: virtual:mdast-type-defs
    presets.ts                           # CREATE: ReleaseNotes / Usage / LLM context
.github/workflows/
  pages.yml                              # CREATE: build -> deploy to Pages
  ci.yml                                 # MODIFY: add playground build + test
```

---

### Task 1: Workspace scaffold + blank playground app

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `playground/package.json`, `playground/tsconfig.json`, `playground/index.html`, `playground/vite.config.ts`, `playground/src/main.tsx`, `playground/src/App.tsx`, `playground/src/App.css`

**Interfaces:**
- Produces: a runnable Vite app at `playground/` rendering a placeholder.

- [ ] **Step 1: Add playground to the workspace** (keep the existing line)

```yaml
minimumReleaseAge: 4320
packages:
  - playground
```

- [ ] **Step 2: Create `playground/package.json`**

```json
{
  "name": "playground",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "mdast-jsx": "workspace:*",
    "mdast-util-to-markdown": "^1.5.0",
    "mdast-util-gfm": "^2.0.2",
    "sucrase": "^3.35.0",
    "quickjs-emscripten": "^0.31.0",
    "@jitl/quickjs-singlefile-browser-release-sync": "^0.31.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "monaco-editor": "^0.52.0",
    "@monaco-editor/react": "^4.6.0"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "@types/mdast": "^3.0.0",
    "@types/unist": "^2.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 3: Create `playground/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `playground/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>mdast-jsx playground</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `playground/vite.config.ts`** (plugins added in Task 6)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/mdast-jsx/', // GitHub Pages serves the project site under /<repo>/
  plugins: [react()],
})
```

- [ ] **Step 6: Create a placeholder `playground/src/App.tsx`**

```tsx
/** Root playground component. Filled in by Task 7. */
export function App() {
  return <main>mdast-jsx playground (scaffold)</main>
}
```

- [ ] **Step 7: Create `playground/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 8: Create `playground/src/App.css`**

```css
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: system-ui, sans-serif; }
```

- [ ] **Step 9: Install + verify build**

Run: `pnpm install && pnpm --filter playground build`
Expected: install resolves `mdast-jsx` via `workspace:*`; build emits `playground/dist/`.

- [ ] **Step 10: Stage (do NOT commit)**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml playground/
```

---

### Task 2: `buildVmModules()` - bundle the three VM modules (TDD)

**Files:**
- Create: `playground/src/lib/vm-modules.ts`, `playground/vitest.config.ts`
- Test: `playground/src/lib/vm-modules.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /** Specifier -> self-contained ESM source string, for the quickjs module loader. */
  export function buildVmModules(): Promise<Record<string, string>>
  ```
  Keys: `mdast-jsx/jsx-runtime`, `mdast-jsx`, `mdast-util-to-markdown`, `mdast-util-gfm`. Consumed by Task 3 (tests) and Task 6 (Vite plugin).

- [ ] **Step 1: Create `playground/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

- [ ] **Step 2: Write the failing test**

`playground/src/lib/vm-modules.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { buildVmModules } from './vm-modules'

describe('buildVmModules', () => {
  let mods: Record<string, string>
  beforeAll(async () => {
    mods = await buildVmModules()
  })

  it('bundles all three modules as non-empty ESM', () => {
    expect(mods['mdast-jsx/jsx-runtime']).toContain('export')
    expect(mods['mdast-util-to-markdown'].length).toBeGreaterThan(1000)
    expect(mods['mdast-util-gfm'].length).toBeGreaterThan(1000)
  })

  it('aliases bare mdast-jsx to the runtime', () => {
    expect(mods['mdast-jsx']).toBe(mods['mdast-jsx/jsx-runtime'])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter playground test -- vm-modules`
Expected: FAIL ("Cannot find module './vm-modules'").

- [ ] **Step 4: Implement `vm-modules.ts`**

```ts
import { build } from 'esbuild'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/** Bundle a package (resolved from this workspace) to a single ESM string. */
async function bundlePackage(spec: string): Promise<string> {
  const result = await build({
    stdin: { contents: `export * from '${spec}'`, resolveDir: here, loader: 'js' },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    legalComments: 'none',
  })
  return result.outputFiles[0].text
}

/**
 * Pre-bundle the pure-JS modules the quickjs VM needs: the mdast-jsx runtime and
 * the two markdown serializers. Each bundle is self-contained so the VM's module
 * loader can resolve the bare specifiers user code imports.
 */
export async function buildVmModules(): Promise<Record<string, string>> {
  const [jsxRuntime, toMarkdown, gfm] = await Promise.all([
    bundlePackage('mdast-jsx/jsx-runtime'),
    bundlePackage('mdast-util-to-markdown'),
    bundlePackage('mdast-util-gfm'),
  ])
  return {
    'mdast-jsx/jsx-runtime': jsxRuntime,
    'mdast-jsx': jsxRuntime,
    'mdast-util-to-markdown': toMarkdown,
    'mdast-util-gfm': gfm,
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter playground test -- vm-modules`
Expected: PASS. (If `mdast-jsx/jsx-runtime` fails to resolve, run `pnpm build` at the repo root so `dist/` exists.)

- [ ] **Step 6: Stage (do NOT commit)**

```bash
git add playground/vitest.config.ts playground/src/lib/vm-modules.ts playground/src/lib/vm-modules.test.ts
```

---

### Task 3: `runTsx()` - compile + run in quickjs -> markdown (TDD, de-risk milestone)

**Files:**
- Create: `playground/src/lib/run-tsx.ts`
- Test: `playground/src/lib/run-tsx.test.ts`

This task proves the core risk (Sucrase output + the bundled serializers executing inside quickjs). Do it before any UI.

**Interfaces:**
- Consumes: `buildVmModules()` (Task 2); `QuickJSWASMModule` from `quickjs-emscripten`.
- Produces:
  ```ts
  export interface RunTsxDeps {
    QuickJS: import('quickjs-emscripten').QuickJSWASMModule
    vmModules: Record<string, string>
    timeoutMs?: number // default 1000
  }
  export type RunResult = { ok: true; md: string } | { ok: false; error: string }
  export function runTsx(source: string, deps: RunTsxDeps): RunResult
  ```
  Consumed by `App.tsx` (Task 7).

- [ ] **Step 1: Write the failing test**

`playground/src/lib/run-tsx.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { getQuickJS } from 'quickjs-emscripten'
import { buildVmModules } from './vm-modules'
import { runTsx, type RunTsxDeps } from './run-tsx'

const IMPORTS = `
import { toMarkdown } from 'mdast-util-to-markdown'
import { gfmToMarkdown } from 'mdast-util-gfm'
`

describe('runTsx', () => {
  let deps: RunTsxDeps
  beforeAll(async () => {
    deps = { QuickJS: await getQuickJS(), vmModules: await buildVmModules() }
  })
  const run = (body: string) => runTsx(IMPORTS + body, deps)

  it('serializes a heading via toMarkdown', () => {
    const r = run(`export default toMarkdown(<heading depth={2}>Title</heading>)`)
    expect(r).toEqual({ ok: true, md: '## Title\n' })
  })

  it('handles a component with .map', () => {
    const r = run(`
      const items = ['a', 'b']
      const L = () => <list>{items.map((i) => <listItem><paragraph>{i}</paragraph></listItem>)}</list>
      export default toMarkdown(<L />)
    `)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.md).toBe('* a\n* b\n')
  })

  it('emits GFM tables', () => {
    const r = run(`
      export default toMarkdown(
        <table>
          <tableRow><tableCell>Name</tableCell><tableCell>Count</tableCell></tableRow>
          <tableRow><tableCell>a</tableCell><tableCell>1</tableCell></tableRow>
        </table>,
        { extensions: [gfmToMarkdown()] },
      )
    `)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.md).toContain('| Name | Count |')
  })

  it('returns a compile error for bad syntax', () => {
    const r = run(`export default toMarkdown(<heading depth={2}>oops`)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Compile error/)
  })

  it('returns a runtime error when code throws', () => {
    const r = run(`throw new Error('boom'); export default ''`)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('boom')
  })

  it('blocks disallowed imports', () => {
    const r = run(`import fs from 'node:fs'; export default ''`)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('node:fs')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter playground test -- run-tsx`
Expected: FAIL ("Cannot find module './run-tsx'").

- [ ] **Step 3: Implement `run-tsx.ts`**

```ts
import { transform } from 'sucrase'
import { shouldInterruptAfterDeadline, type QuickJSWASMModule } from 'quickjs-emscripten'

export interface RunTsxDeps {
  QuickJS: QuickJSWASMModule
  /** Specifier -> ESM source, injected into the VM's module loader. */
  vmModules: Record<string, string>
  /** Wall-clock budget for VM execution, ms. Default 1000. */
  timeoutMs?: number
}

export type RunResult = { ok: true; md: string } | { ok: false; error: string }

/** Pull a readable message out of a dumped VM error value. */
function vmErrorMessage(dumped: unknown): string {
  if (dumped && typeof dumped === 'object' && 'message' in dumped) {
    return String((dumped as { message: unknown }).message)
  }
  return String(dumped)
}

/**
 * Compile TSX to ESM (Sucrase, automatic runtime -> mdast-jsx), run it inside a
 * sandboxed quickjs VM whose module loader serves the injected mdast modules, and
 * return the markdown string the module default-exports.
 */
export function runTsx(source: string, deps: RunTsxDeps): RunResult {
  let code: string
  try {
    code = transform(source, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'automatic',
      jsxImportSource: 'mdast-jsx',
      production: true,
      filePath: 'input.tsx',
    }).code
  } catch (err) {
    return { ok: false, error: `Compile error: ${(err as Error).message}` }
  }

  const runtime = deps.QuickJS.newRuntime()
  runtime.setMemoryLimit(64 * 1024 * 1024)
  runtime.setMaxStackSize(1024 * 1024)
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + (deps.timeoutMs ?? 1000)))
  runtime.setModuleLoader((name) => {
    const src = deps.vmModules[name]
    if (src === undefined) return { error: new Error(`Cannot import "${name}" in the playground`) }
    return src
  })

  const ctx = runtime.newContext()
  try {
    const result = ctx.evalCode(code, 'input.js', { type: 'module' })
    if (result.error) {
      const dumped = ctx.dump(result.error)
      result.error.dispose()
      return { ok: false, error: `Runtime error: ${vmErrorMessage(dumped)}` }
    }
    const ns = result.value
    const def = ctx.getProp(ns, 'default')
    const value = ctx.dump(def)
    def.dispose()
    ns.dispose()
    if (typeof value !== 'string') {
      return {
        ok: false,
        error: 'Default export must be the result of toMarkdown(...) - a markdown string.',
      }
    }
    return { ok: true, md: value }
  } finally {
    ctx.dispose()
    runtime.dispose()
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter playground test -- run-tsx`
Expected: PASS (all 6). If the list-marker assertion (`* a\n* b\n`) differs from the serializer's default bullet, inspect the real output and adjust that one assertion; do NOT loosen the error-path or sandbox tests. If `setModuleLoader`'s `{ error }` return is rejected by the types/runtime, throw inside the loader instead (`throw new Error(...)`) and assert the message the same way.

- [ ] **Step 5: Stage (do NOT commit)**

```bash
git add playground/src/lib/run-tsx.ts playground/src/lib/run-tsx.test.ts
```

---

### Task 4: `collectTypeDefs()` - real mdast types + ambient serializer shims (TDD)

**Files:**
- Create: `playground/src/lib/type-defs.ts`
- Test: `playground/src/lib/type-defs.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TypeDef { filePath: string; content: string }
  export function collectTypeDefs(): TypeDef[]
  ```
  `filePath` is a Monaco virtual path. Consumed by Task 6 (Vite plugin) + Task 7 (Editor).

- [ ] **Step 1: Write the failing test**

`playground/src/lib/type-defs.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { collectTypeDefs } from './type-defs'

describe('collectTypeDefs', () => {
  const byPath = () => Object.fromEntries(collectTypeDefs().map((d) => [d.filePath, d.content]))

  it('includes real mdast-jsx / mdast / unist types', () => {
    const m = byPath()
    expect(m['file:///node_modules/mdast-jsx/jsx-runtime.d.ts']).toMatch(/IntrinsicElements/)
    expect(m['file:///node_modules/@types/mdast/index.d.ts']).toMatch(/Heading/)
    expect(m['file:///node_modules/@types/unist/index.d.ts']).toMatch(/Node/)
  })

  it('includes ambient shims for the serializers', () => {
    const m = byPath()
    expect(m['file:///node_modules/mdast-util-to-markdown/index.d.ts']).toMatch(/toMarkdown/)
    expect(m['file:///node_modules/mdast-util-gfm/index.d.ts']).toMatch(/gfmToMarkdown/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter playground test -- type-defs`
Expected: FAIL ("Cannot find module './type-defs'").

- [ ] **Step 3: Implement `type-defs.ts`**

```ts
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const pkgDir = (spec: string) => dirname(require.resolve(`${spec}/package.json`))

export interface TypeDef {
  filePath: string
  content: string
}

// Hand-written ambient shims: the editor imports these, but we don't want the full
// micromark type graph in Monaco. Just enough for squiggle-free authentic imports.
const TO_MARKDOWN_SHIM = `
export function toMarkdown(tree: unknown, options?: { extensions?: unknown[] }): string
`
const GFM_SHIM = `export function gfmToMarkdown(): unknown\n`

/**
 * The .d.ts payload Monaco needs: real types for the mdast JSX (the library's value
 * prop) plus lightweight ambient shims for the markdown serializers.
 */
export function collectTypeDefs(): TypeDef[] {
  const read = (file: string) => readFileSync(file, 'utf8')
  return [
    {
      filePath: 'file:///node_modules/mdast-jsx/jsx-runtime.d.ts',
      content: read(join(pkgDir('mdast-jsx'), 'dist/jsx-runtime.d.ts')),
    },
    {
      filePath: 'file:///node_modules/@types/mdast/index.d.ts',
      content: read(join(pkgDir('@types/mdast'), 'index.d.ts')),
    },
    {
      filePath: 'file:///node_modules/@types/unist/index.d.ts',
      content: read(join(pkgDir('@types/unist'), 'index.d.ts')),
    },
    { filePath: 'file:///node_modules/mdast-util-to-markdown/index.d.ts', content: TO_MARKDOWN_SHIM },
    { filePath: 'file:///node_modules/mdast-util-gfm/index.d.ts', content: GFM_SHIM },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter playground test -- type-defs`
Expected: PASS. (If `@types/unist` won't resolve, confirm it's in `devDependencies` from Task 1.)

- [ ] **Step 5: Stage (do NOT commit)**

```bash
git add playground/src/lib/type-defs.ts playground/src/lib/type-defs.test.ts
```

---

### Task 5: Presets (ReleaseNotes / Usage / LLM context)

**Files:**
- Create: `playground/src/presets.ts`

**Interfaces:**
- Produces: `export const PRESETS: { name: string; code: string }[]` (index 0 = ReleaseNotes default). Consumed by `App.tsx` (Task 7).

- [ ] **Step 1: Implement `presets.ts`**

```ts
const RELEASE_NOTES = `import { toMarkdown } from 'mdast-util-to-markdown'
import { gfmToMarkdown } from 'mdast-util-gfm'

type PR = { title: string; author: string; n: number; type: 'feat' | 'fix' }

const merged: PR[] = [
  { title: 'Dark mode', author: 'sam', n: 412, type: 'feat' },
  { title: 'Stripe webhooks', author: 'lee', n: 415, type: 'feat' },
  { title: 'Timezone off-by-one', author: 'sam', n: 418, type: 'fix' },
]

// Empty groups return null, so their heading disappears - no dangling section.
const Section = ({ title, prs }: { title: string; prs: PR[] }) =>
  prs.length === 0 ? null : (
    <>
      <heading depth={3}>{title}</heading>
      <list>
        {prs.map((pr) => (
          <listItem>
            <paragraph>
              {pr.title} by @{pr.author} (#{pr.n})
            </paragraph>
          </listItem>
        ))}
      </list>
    </>
  )

const ReleaseNotes = () => (
  <>
    <heading depth={2}>v2.1.0</heading>
    <Section title="Features" prs={merged.filter((p) => p.type === 'feat')} />
    <Section title="Bug fixes" prs={merged.filter((p) => p.type === 'fix')} />
  </>
)

export default toMarkdown(<ReleaseNotes />, { extensions: [gfmToMarkdown()] })
`

const USAGE_TABLE = `import { toMarkdown } from 'mdast-util-to-markdown'
import { gfmToMarkdown } from 'mdast-util-gfm'

const rows = [
  { user: 'Acme', plan: 'Pro', seats: 12 },
  { user: 'Globex', plan: 'Free', seats: 1 },
]

const Usage = () => (
  <table align={['left', 'left', 'right']}>
    <tableRow>
      <tableCell>User</tableCell>
      <tableCell>Plan</tableCell>
      <tableCell>Seats</tableCell>
    </tableRow>
    {rows.map((r) => (
      <tableRow>
        <tableCell>{r.user}</tableCell>
        <tableCell>{r.plan}</tableCell>
        <tableCell>{String(r.seats)}</tableCell>
      </tableRow>
    ))}
  </table>
)

export default toMarkdown(<Usage />, { extensions: [gfmToMarkdown()] })
`

const LLM_CONTEXT = `import { toMarkdown } from 'mdast-util-to-markdown'

const order = {
  id: 'A-1042',
  customer: 'Sam',
  items: [
    { name: 'Keyboard', qty: 1, price: 80 },
    { name: 'Mouse', qty: 2, price: 25 },
  ],
}

const Context = () => (
  <>
    <heading depth={1}>Order {order.id}</heading>
    <paragraph>
      Customer: <strong>{order.customer}</strong>
    </paragraph>
    <list>
      {order.items.map((i) => (
        <listItem>
          <paragraph>
            {i.name} x{i.qty} - \${i.price}
          </paragraph>
        </listItem>
      ))}
    </list>
  </>
)

// Feed this markdown straight to an LLM.
export default toMarkdown(<Context />)
`

/** Starter examples; index 0 is the default shown on load. */
export const PRESETS: { name: string; code: string }[] = [
  { name: 'Release notes', code: RELEASE_NOTES },
  { name: 'Usage table', code: USAGE_TABLE },
  { name: 'LLM context', code: LLM_CONTEXT },
]
```

- [ ] **Step 2: Sanity-check the presets compile + run**

Add a temporary test `playground/src/presets.test.ts`, run it, then delete it:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { getQuickJS } from 'quickjs-emscripten'
import { buildVmModules } from './lib/vm-modules'
import { runTsx, type RunTsxDeps } from './lib/run-tsx'
import { PRESETS } from './presets'

describe('presets', () => {
  let deps: RunTsxDeps
  beforeAll(async () => {
    deps = { QuickJS: await getQuickJS(), vmModules: await buildVmModules() }
  })
  it.each(PRESETS)('$name produces markdown', (preset) => {
    const r = runTsx(preset.code, deps)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.md.length).toBeGreaterThan(0)
  })
})
```

Run: `pnpm --filter playground test -- presets`
Expected: PASS (all three). Then delete `presets.test.ts`.

- [ ] **Step 3: Stage (do NOT commit)**

```bash
git add playground/src/presets.ts
```

---

### Task 6: Vite virtual-module plugins (vm-modules + type-defs)

**Files:**
- Create: `playground/src/plugins/vite-plugin-vm-modules.ts`, `playground/src/plugins/vite-plugin-type-defs.ts`, `playground/src/vite-env.d.ts`
- Modify: `playground/vite.config.ts`

**Interfaces:**
- Consumes: `buildVmModules()` (Task 2), `collectTypeDefs()` (Task 4).
- Produces: `virtual:vm-modules` (default export `Record<string,string>`) and `virtual:mdast-type-defs` (default export `TypeDef[]`).

- [ ] **Step 1: Implement `vite-plugin-vm-modules.ts`**

```ts
import type { Plugin } from 'vite'
import { buildVmModules } from '../lib/vm-modules'

const ID = 'virtual:vm-modules'
const RESOLVED = '\0' + ID

/** Inlines the pre-bundled quickjs VM module sources for the browser bundle. */
export function vmModulesPlugin(): Plugin {
  return {
    name: 'vm-modules',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    async load(id) {
      if (id === RESOLVED) return `export default ${JSON.stringify(await buildVmModules())}`
    },
  }
}
```

- [ ] **Step 2: Implement `vite-plugin-type-defs.ts`**

```ts
import type { Plugin } from 'vite'
import { collectTypeDefs } from '../lib/type-defs'

const ID = 'virtual:mdast-type-defs'
const RESOLVED = '\0' + ID

/** Inlines the Monaco .d.ts payload (uses node:fs, must run at build time). */
export function typeDefsPlugin(): Plugin {
  return {
    name: 'mdast-type-defs',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load: (id) => (id === RESOLVED ? `export default ${JSON.stringify(collectTypeDefs())}` : undefined),
  }
}
```

- [ ] **Step 3: Create `playground/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

declare module 'virtual:vm-modules' {
  const mods: Record<string, string>
  export default mods
}
declare module 'virtual:mdast-type-defs' {
  const defs: { filePath: string; content: string }[]
  export default defs
}
```

- [ ] **Step 4: Wire both plugins into `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vmModulesPlugin } from './src/plugins/vite-plugin-vm-modules'
import { typeDefsPlugin } from './src/plugins/vite-plugin-type-defs'

export default defineConfig({
  base: '/mdast-jsx/',
  plugins: [react(), vmModulesPlugin(), typeDefsPlugin()],
})
```

- [ ] **Step 5: Verify build resolves the virtual modules**

Run: `pnpm --filter playground build`
Expected: build succeeds.

- [ ] **Step 6: Stage (do NOT commit)**

```bash
git add playground/src/plugins/ playground/src/vite-env.d.ts playground/vite.config.ts
```

---

### Task 7: Monaco Editor with TS wiring (the "wow")

**Files:**
- Create: `playground/src/components/Editor.tsx`

**Interfaces:**
- Consumes: `virtual:mdast-type-defs` (Task 6).
- Produces: `export function Editor(props: { value: string; onChange: (v: string) => void }): JSX.Element`. Consumed by `App.tsx` (Task 8).

Verification-based (Monaco wiring isn't unit-testable). This is the riskiest UI piece - verify squiggles before moving on.

- [ ] **Step 1: Implement `Editor.tsx`**

```tsx
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import typeDefs from 'virtual:mdast-type-defs'

/** Monaco configured so mdast-jsx JSX type-checks against the mdast schema. */
export function Editor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handleMount: OnMount = (_editor, monaco) => {
    const ts = monaco.languages.typescript.typescriptDefaults
    ts.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      jsxImportSource: 'mdast-jsx',
      strict: true,
      allowNonTsExtensions: true,
      skipLibCheck: true,
    })
    for (const { filePath, content } of typeDefs) ts.addExtraLib(content, filePath)
  }

  return (
    <MonacoEditor
      language="typescript"
      path="file:///input.tsx"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
    />
  )
}
```

- [ ] **Step 2: Temporarily mount it for manual verification**

Replace `App.tsx` body temporarily:

```tsx
import { useState } from 'react'
import { Editor } from './components/Editor'

export function App() {
  const [code, setCode] = useState('export default <heading>Title</heading>')
  return <div style={{ height: '100vh' }}><Editor value={code} onChange={setCode} /></div>
}
```

- [ ] **Step 3: Verify live type errors**

Run: `pnpm --filter playground dev`, open the URL.
Expected:
- `<heading>Title</heading>` (no `depth`) shows *"Property 'depth' is missing..."*; adding `depth={2}` clears it.
- Autocomplete offers `heading` after typing `<head`; hover shows props.
- `<bogusTag />` errors.
Do not proceed until squiggles work. If they don't: check `path` ends in `.tsx`, `jsxImportSource` is set, all five `.d.ts` are present in `typeDefs`, and `@types/mdast`'s `index.d.ts` can resolve `unist`.

- [ ] **Step 4: Stage (do NOT commit)**

```bash
git add playground/src/components/Editor.tsx playground/src/App.tsx
```

---

### Task 8: App integration + OutputPane (quickjs init, debounce, toggle, errors)

**Files:**
- Create: `playground/src/components/OutputPane.tsx`
- Modify: `playground/src/main.tsx`, `playground/src/App.tsx`, `playground/src/App.css`

**Interfaces:**
- Consumes: `runTsx`/`RunTsxDeps` (Task 3), `Editor` (Task 7), `PRESETS` (Task 5), `virtual:vm-modules` (Task 6), the quickjs single-file variant.
- Produces: the finished app.

- [ ] **Step 1: Implement `OutputPane.tsx`** (react-markdown for preview)

```tsx
import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type View = 'md' | 'preview'

/** Right pane: raw markdown, rendered preview, or an error banner. */
export function OutputPane({ md, error }: { md: string; error: string | null }) {
  const [view, setView] = useState<View>('md')
  return (
    <section className="pane output">
      <header className="pane-header">
        <button className={view === 'md' ? 'active' : ''} onClick={() => setView('md')}>Markdown</button>
        <button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>Preview</button>
      </header>
      {error ? (
        <pre className="error">{error}</pre>
      ) : view === 'md' ? (
        <pre className="md">{md}</pre>
      ) : (
        <div className="preview"><Markdown remarkPlugins={[remarkGfm]}>{md}</Markdown></div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Initialize quickjs in `main.tsx` and pass it down**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten'
import variant from '@jitl/quickjs-singlefile-browser-release-sync'
import vmModules from 'virtual:vm-modules'
import { App } from './App'
import './App.css'

const QuickJS = await newQuickJSWASMModuleFromVariant(variant)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App QuickJS={QuickJS} vmModules={vmModules} />
  </StrictMode>,
)
```

(Top-level `await` is fine - this is an ESM module script. If the variant's default export shape differs, adjust per `@jitl/quickjs-singlefile-browser-release-sync`'s README; the import is the single point to fix.)

- [ ] **Step 3: Implement the real `App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import type { QuickJSWASMModule } from 'quickjs-emscripten'
import { Editor } from './components/Editor'
import { OutputPane } from './components/OutputPane'
import { runTsx } from './lib/run-tsx'
import { PRESETS } from './presets'

export function App({
  QuickJS,
  vmModules,
}: {
  QuickJS: QuickJSWASMModule
  vmModules: Record<string, string>
}) {
  const [code, setCode] = useState(PRESETS[0].code)
  const [md, setMd] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      const result = runTsx(code, { QuickJS, vmModules })
      if (result.ok) {
        setMd(result.md)
        setError(null)
      } else {
        setError(result.error)
      }
    }, 300)
    return () => clearTimeout(id)
  }, [code, QuickJS, vmModules])

  return (
    <div className="app">
      <header className="toolbar">
        <strong>mdast-jsx</strong>
        <select onChange={(e) => setCode(PRESETS[Number(e.target.value)].code)} defaultValue="0">
          {PRESETS.map((p, i) => (
            <option key={p.name} value={i}>{p.name}</option>
          ))}
        </select>
      </header>
      <div className="panes">
        <section className="pane"><Editor value={code} onChange={setCode} /></section>
        <OutputPane md={md} error={error} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Flesh out `App.css`**

```css
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: system-ui, sans-serif; }

.app { display: flex; flex-direction: column; height: 100vh; }
.toolbar { display: flex; gap: 1rem; align-items: center; padding: 0.5rem 1rem; border-bottom: 1px solid #8884; }
.panes { flex: 1; display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
.pane { min-width: 0; min-height: 0; display: flex; flex-direction: column; border-left: 1px solid #8884; }
.pane:first-child { border-left: none; }
.pane-header { display: flex; gap: 0.25rem; padding: 0.25rem 0.5rem; border-bottom: 1px solid #8884; }
.pane-header button { background: transparent; border: 1px solid #8884; border-radius: 4px; padding: 0.15rem 0.6rem; cursor: pointer; }
.pane-header button.active { background: #8883; }
.output { overflow: auto; }
.output .md, .output .error { margin: 0; padding: 1rem; white-space: pre-wrap; font-family: ui-monospace, monospace; }
.output .error { color: #e55; }
.output .preview { padding: 1rem; }
```

- [ ] **Step 5: Verify end-to-end**

Run: `pnpm --filter playground dev`
Expected:
- Release-notes preset loads; markdown appears within ~300ms.
- Editing updates live; Preview tab renders HTML, Markdown tab shows raw.
- Deleting the single `fix` PR makes the "Bug fixes" section vanish from the output (the conditional payoff).
- A syntax error shows the error banner; last good MD is retained on the MD tab.
- Switching presets works.

- [ ] **Step 6: Build to confirm production bundle works**

Run: `pnpm --filter playground build && pnpm --filter playground preview`
Expected: production build serves and behaves the same (confirms the single-file wasm variant loads under `base`).

- [ ] **Step 7: Stage (do NOT commit)**

```bash
git add playground/src/components/OutputPane.tsx playground/src/main.tsx playground/src/App.tsx playground/src/App.css
```

---

### Task 9: GitHub Pages deploy workflow + CI check

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/pages.yml`**

```yaml
name: Deploy playground

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build                       # lib -> dist/ (playground reads it)
      - run: pnpm --filter playground build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: playground/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Add playground build + test to `ci.yml`** (after the existing `pnpm test` step)

```yaml
      - run: pnpm --filter playground build

      - run: pnpm --filter playground test
```

- [ ] **Step 3: Verify the full chain locally (mirrors CI)**

Run: `pnpm install --frozen-lockfile && pnpm build && pnpm --filter playground build && pnpm --filter playground test`
Expected: all succeed.

- [ ] **Step 4: Stage (do NOT commit)**

```bash
git add .github/workflows/pages.yml .github/workflows/ci.yml
```

- [ ] **Step 5: Note for the user (one-time, manual)**

After pushing, enable Pages: **Settings -> Pages -> Source: GitHub Actions**. Site: `https://supabase-community.github.io/mdast-jsx/`.

---

## Self-Review

**Spec coverage:**
- In-repo `playground/` + Pages Action -> Tasks 1, 9. ✓
- Monaco + TS service (`jsxImportSource`, real mdast types + ambient serializer shims) -> Tasks 4, 6, 7. ✓
- quickjs sandbox, ESM, `toMarkdown` in VM, injected modules -> Tasks 2, 3. ✓
- 2-pane + raw/preview toggle via react-markdown, debounce, error pane -> Task 8. ✓
- Dynamic presets (ReleaseNotes default, Usage, LLM context) -> Task 5. ✓
- Lib stays at root, release pipeline untouched -> Global Constraints + Task 1. ✓
- Out of scope (share URLs, multi-file, npm mode) -> not implemented. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; every command has expected output. ✓

**Type consistency:** `RunTsxDeps`/`RunResult`/`runTsx` consistent across Tasks 3, 8; `buildVmModules` return shape consistent across Tasks 2, 6, 8 (and the injected-module keys match `run-tsx`'s loader lookups); `TypeDef` consistent across Tasks 4, 6; `collectTypeDefs` paths match `Editor`'s `addExtraLib` loop; `App` props (`QuickJS`, `vmModules`) match `main.tsx`. ✓

**De-risk ordering:** the two real unknowns - serializers running inside quickjs (Tasks 2+3) and Monaco producing real mdast errors (Tasks 4+6+7) - are both proven before the full UI is assembled (Task 8). ✓

**Known follow-ups (not blocking v1):** draggable splitter (fixed 50/50 for now); shareable URLs (deferred, safe under quickjs when added); VM bytecode caching if per-run module re-parse becomes a perf issue; task-list checkbox rendering depends on react-markdown/remark-gfm defaults.
