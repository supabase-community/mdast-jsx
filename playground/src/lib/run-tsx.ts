import { transform } from 'sucrase'
import { shouldInterruptAfterDeadline } from 'quickjs-emscripten'
import type { QuickJSWASMModule } from 'quickjs-emscripten'

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

/** Extract all static import specifiers from source code. */
function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  // Match: import ... from 'specifier' or import ... from "specifier"
  // Also: import 'specifier' (side-effect imports)
  const re = /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    specifiers.push(m[1])
  }
  return specifiers
}

/**
 * Compile TSX to ESM (Sucrase, automatic runtime -> mdast-jsx), run it inside a
 * sandboxed quickjs VM whose module loader serves the injected mdast modules, and
 * return the markdown string the module default-exports.
 */
export function runTsx(source: string, deps: RunTsxDeps): RunResult {
  // Validate imports against allowlist before Sucrase can strip unused ones
  const specifiers = extractImportSpecifiers(source)
  for (const spec of specifiers) {
    if (!(spec in deps.vmModules)) {
      return { ok: false, error: `Cannot import "${spec}" in the playground` }
    }
  }

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
    if (src === undefined) throw new Error(`Cannot import "${name}" in the playground`)
    return src
  })

  const ctx = runtime.newContext()
  try {
    const result = ctx.evalCode(code, 'input.js', { type: 'module' })
    if (result.error) {
      const dumped = ctx.dump(result.error)
      result.error.dispose()
      return { ok: false, error: vmErrorMessage(dumped) }
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
