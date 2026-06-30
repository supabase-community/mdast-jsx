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
