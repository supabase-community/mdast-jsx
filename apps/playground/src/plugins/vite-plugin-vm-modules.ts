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
