import { describe, it, expect, beforeAll } from 'vitest'
import { buildVmModules } from './vm-modules'

describe('buildVmModules', () => {
  let mods: Record<string, string>
  beforeAll(async () => {
    mods = await buildVmModules()
  })

  it('bundles the VM modules as non-empty ESM', () => {
    expect(mods['mdast-jsx/jsx-runtime']).toContain('export')
    expect(mods['mdast-util-to-markdown'].length).toBeGreaterThan(1000)
    expect(mods['mdast-util-gfm'].length).toBeGreaterThan(1000)
    expect(mods['mdast-util-from-markdown'].length).toBeGreaterThan(1000)
  })

  it('aliases bare mdast-jsx to the runtime', () => {
    expect(mods['mdast-jsx']).toBe(mods['mdast-jsx/jsx-runtime'])
  })
})
