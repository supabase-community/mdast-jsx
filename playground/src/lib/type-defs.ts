import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export interface TypeDef {
  filePath: string
  content: string
}

/** Resolve a package's root dir from `fromDir`, even if it doesn't export `./package.json`. */
function resolvePkgDir(spec: string, fromDir: string): string | null {
  const require = createRequire(join(fromDir, 'noop.js'))
  try {
    return dirname(require.resolve(`${spec}/package.json`))
  } catch {
    // Some packages (e.g. mdast-jsx) don't expose ./package.json in `exports`;
    // resolve the entry and walk up to the dir whose package.json names `spec`.
    try {
      let dir = dirname(require.resolve(spec))
      while (dir !== dirname(dir)) {
        const pj = join(dir, 'package.json')
        if (existsSync(pj)) {
          try {
            if (JSON.parse(readFileSync(pj, 'utf8')).name === spec) return dir
          } catch {
            /* ignore malformed package.json */
          }
        }
        dir = dirname(dir)
      }
    } catch {
      /* unresolvable */
    }
    return null
  }
}

/** All `.d.ts` / `.d.cts` / `.d.mts` files in a package (excluding nested node_modules). */
function collectDts(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      if (entry === 'node_modules') continue
      const full = join(d, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.d.ts') || entry.endsWith('.d.cts') || entry.endsWith('.d.mts'))
        out.push(full)
    }
  }
  walk(dir)
  return out
}

/**
 * Collect the full `.d.ts` closure for the packages the editor uses, so Monaco's
 * TS service type-checks against the libraries' real types - no hand-written stubs.
 * Walks runtime dependencies (which carry the type closure in the mdast ecosystem),
 * emitting each file at its real `node_modules/<pkg>/<path>` so resolution just works.
 */
export function collectTypeDefs(): TypeDef[] {
  const roots = ['mdast-jsx', 'mdast-util-to-markdown', 'mdast-util-gfm', 'mdast-util-from-markdown']
  const seen = new Set<string>()
  const defs: TypeDef[] = []
  const queue: { spec: string; from: string }[] = roots.map((spec) => ({ spec, from: here }))

  while (queue.length) {
    const { spec, from } = queue.shift()!
    if (seen.has(spec)) continue
    seen.add(spec)

    const dir = resolvePkgDir(spec, from)
    if (!dir) continue

    let pkg: { dependencies?: Record<string, string> } = {}
    try {
      const raw = readFileSync(join(dir, 'package.json'), 'utf8')
      pkg = JSON.parse(raw)
      defs.push({ filePath: `file:///node_modules/${spec}/package.json`, content: raw })
    } catch {
      /* ignore */
    }

    for (const file of collectDts(dir)) {
      const rel = relative(dir, file).split(sep).join('/')
      defs.push({
        filePath: `file:///node_modules/${spec}/${rel}`,
        content: readFileSync(file, 'utf8'),
      })
    }

    for (const dep of Object.keys(pkg.dependencies ?? {})) queue.push({ spec: dep, from: dir })
  }

  // The editor resolves the JSX runtime via `jsxImportSource: mdast-jsx`. Classic
  // (node10) resolution needs the literal subpath file, which lives under dist/.
  const mdastJsxDir = resolvePkgDir('mdast-jsx', here)
  if (mdastJsxDir) {
    defs.push({
      filePath: 'file:///node_modules/mdast-jsx/jsx-runtime.d.ts',
      content: readFileSync(join(mdastJsxDir, 'dist/jsx-runtime.d.ts'), 'utf8'),
    })
  }

  return defs
}
