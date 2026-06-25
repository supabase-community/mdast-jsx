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
    if (r.ok) expect(r.md).toBe('*   a\n\n*   b\n')
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
