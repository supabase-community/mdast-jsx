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
    // Use 'neutral' so packages that have browser-conditional exports (e.g.
    // decode-named-character-reference) resolve to their non-DOM variant.
    // The quickjs VM has no DOM globals, so the browser bundle would crash.
    platform: 'neutral',
    write: false,
    legalComments: 'none',
  })
  return result.outputFiles[0].text
}

/**
 * Pre-bundle the pure-JS modules the quickjs VM can import: the mdast-jsx runtime,
 * the two markdown serializers, and the markdown parser (so user code can round-trip
 * markdown -> mdast). Each bundle is self-contained so the VM's module loader can
 * resolve the bare specifiers user code imports.
 */
export async function buildVmModules(): Promise<Record<string, string>> {
  const [jsxRuntime, toMarkdown, gfm, fromMarkdown] = await Promise.all([
    bundlePackage('mdast-jsx/jsx-runtime'),
    bundlePackage('mdast-util-to-markdown'),
    bundlePackage('mdast-util-gfm'),
    bundlePackage('mdast-util-from-markdown'),
  ])
  return {
    'mdast-jsx/jsx-runtime': jsxRuntime,
    'mdast-jsx': jsxRuntime,
    'mdast-util-to-markdown': toMarkdown,
    'mdast-util-gfm': gfm,
    'mdast-util-from-markdown': fromMarkdown,
  }
}
