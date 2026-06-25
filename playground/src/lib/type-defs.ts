import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

/** Resolve the package root dir for packages that expose `./package.json`. */
const pkgDir = (spec: string) => dirname(require.resolve(`${spec}/package.json`))

/**
 * Resolve the root dir of `mdast-jsx` by locating its main CJS entry and
 * walking up one level out of `dist/`. Needed because `mdast-jsx` does not
 * expose `./package.json` in its exports map.
 */
const mdastJsxDir = () => dirname(dirname(require.resolve('mdast-jsx')))

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
      content: read(join(mdastJsxDir(), 'dist/jsx-runtime.d.ts')),
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
