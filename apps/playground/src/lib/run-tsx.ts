import { transform } from 'sucrase'
import type { QuickJSWASMModule } from 'quickjs-emscripten-core'

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
 * return the markdown string the module default-exports. The module loader is the
 * import allowlist: any specifier it isn't given throws, so user code can only ever
 * reach the modules we inject.
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
  const deadline = Date.now() + (deps.timeoutMs ?? 1000)
  runtime.setInterruptHandler(() => Date.now() > deadline)
  runtime.setModuleLoader((name) => {
    const src = deps.vmModules[name]
    if (src === undefined) throw new Error(`Cannot import "${name}" in the playground`)
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
