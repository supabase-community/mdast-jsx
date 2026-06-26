import { describe, it, expect } from 'vitest'
import { collectTypeDefs } from './type-defs'

describe('collectTypeDefs', () => {
  const defs = collectTypeDefs()
  const byPath = Object.fromEntries(defs.map((d) => [d.filePath, d.content]))
  const allContent = defs.map((d) => d.content).join('\n')

  it('emits the JSX runtime types at the resolvable subpath', () => {
    expect(byPath['file:///node_modules/mdast-jsx/jsx-runtime.d.ts']).toMatch(/IntrinsicElements/)
  })

  it('pulls real mdast + unist types via the dependency closure', () => {
    expect(allContent).toMatch(/interface Heading/) // @types/mdast
    expect(allContent).toMatch(/interface Node/) // @types/unist
  })

  it('pulls the serializers REAL types (not stubs) - e.g. toMarkdown options', () => {
    const toMarkdown = defs
      .filter((d) => d.filePath.includes('/mdast-util-to-markdown/'))
      .map((d) => d.content)
      .join('\n')
    expect(toMarkdown).toMatch(/toMarkdown/)
    // A real Options field that the old hand-written shim omitted:
    expect(toMarkdown).toMatch(/bullet/)
    expect(defs.some((d) => d.filePath.includes('/mdast-util-gfm/'))).toBe(true)
  })

  it('paths are real node_modules layout for resolution', () => {
    expect(byPath['file:///node_modules/mdast-util-to-markdown/package.json']).toBeTruthy()
  })
})
