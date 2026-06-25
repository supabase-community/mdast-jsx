import { describe, it, expect } from 'vitest'
import { collectTypeDefs } from './type-defs'

describe('collectTypeDefs', () => {
  const byPath = () => Object.fromEntries(collectTypeDefs().map((d) => [d.filePath, d.content]))

  it('includes real mdast-jsx / mdast / unist types', () => {
    const m = byPath()
    expect(m['file:///node_modules/mdast-jsx/jsx-runtime.d.ts']).toMatch(/IntrinsicElements/)
    expect(m['file:///node_modules/@types/mdast/index.d.ts']).toMatch(/Heading/)
    expect(m['file:///node_modules/@types/unist/index.d.ts']).toMatch(/Node/)
  })

  it('includes ambient shims for the serializers', () => {
    const m = byPath()
    expect(m['file:///node_modules/mdast-util-to-markdown/index.d.ts']).toMatch(/toMarkdown/)
    expect(m['file:///node_modules/mdast-util-gfm/index.d.ts']).toMatch(/gfmToMarkdown/)
  })
})
