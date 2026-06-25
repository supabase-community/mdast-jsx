/** @jsxRuntime automatic */
/** @jsxImportSource . */

import { gfmToMarkdown } from 'mdast-util-gfm'
import { toMarkdown } from 'mdast-util-to-markdown'
import { describe, expect, it } from 'vitest'

describe('mdast-jsx runtime', () => {
  it('maps tag -> type, props -> fields, children -> children', () => {
    expect(<heading depth={2}>Setup</heading>).toEqual({
      type: 'heading',
      depth: 2,
      children: [{ type: 'text', value: 'Setup' }],
    })
  })

  it('wraps bare strings as text and keeps element children', () => {
    expect(
      <paragraph>
        Install <strong>now</strong>
      </paragraph>
    ).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'Install ' },
        { type: 'strong', children: [{ type: 'text', value: 'now' }] },
      ],
    })
  })

  it('treats value as a prop for literals (self-closing, no children)', () => {
    expect(<code lang="json" value='{"a":1}' />).toEqual({
      type: 'code',
      lang: 'json',
      value: '{"a":1}',
    })
  })

  it('void nodes carry no children', () => {
    expect(<thematicBreak />).toEqual({ type: 'thematicBreak' })
  })

  it('Fragment becomes a root node', () => {
    expect(
      <>
        <paragraph>a</paragraph>
      </>
    ).toEqual({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'a' }] }],
    })
  })

  it('drops null/false children (so `cond && <x/>` works)', () => {
    const show = false
    expect(
      <paragraph>
        a{show && <strong>x</strong>}
        {null}
      </paragraph>
    ).toEqual({ type: 'paragraph', children: [{ type: 'text', value: 'a' }] })
  })

  it('calls Capitalized tags as components', () => {
    const Item = ({ label }: { label: string }) => (
      <listItem>
        <paragraph>{label}</paragraph>
      </listItem>
    )
    expect(
      <list ordered={false}>
        <Item label="one" />
        <Item label="two" />
      </list>
    ).toMatchObject({
      type: 'list',
      children: [{ type: 'listItem' }, { type: 'listItem' }],
    })
  })

  it('flattens a mapped array in among sibling elements', () => {
    const tags = ['x', 'y']
    expect(
      <root>
        <heading depth={3}>Tags</heading>
        {tags.map((t) => (
          <paragraph>{t}</paragraph>
        ))}
        <thematicBreak />
      </root>
    ).toEqual({
      type: 'root',
      children: [
        { type: 'heading', depth: 3, children: [{ type: 'text', value: 'Tags' }] },
        { type: 'paragraph', children: [{ type: 'text', value: 'x' }] },
        { type: 'paragraph', children: [{ type: 'text', value: 'y' }] },
        { type: 'thematicBreak' },
      ],
    })
  })

  it('supports ternary children', () => {
    const ok = true
    expect(
      <paragraph>{ok ? <strong>yes</strong> : <emphasis>no</emphasis>}</paragraph>
    ).toMatchObject({ type: 'paragraph', children: [{ type: 'strong' }] })
  })

  it('flattens nested Fragments (map of fragments) like React', () => {
    const groups = [['a', 'b'], ['c']]
    expect(
      <root>
        {groups.map((g) => (
          <>
            {g.map((x) => (
              <paragraph>{x}</paragraph>
            ))}
          </>
        ))}
      </root>
    ).toEqual({
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: 'a' }] },
        { type: 'paragraph', children: [{ type: 'text', value: 'b' }] },
        { type: 'paragraph', children: [{ type: 'text', value: 'c' }] },
      ],
    })
  })

  it('serializes a built tree to markdown', () => {
    const tree = (
      <root>
        <heading depth={2}>Setup</heading>
        <paragraph>
          Run <inlineCode value="npm i" />
        </paragraph>
        <code lang="bash" value="claude /mcp" />
      </root>
    )
    const out = toMarkdown(tree, { extensions: [gfmToMarkdown()], bullet: '-' })
    expect(out).toContain('## Setup')
    expect(out).toContain('Run `npm i`')
    expect(out).toContain('```bash\nclaude /mcp\n```')
  })

  it('builds a gfm table (serialized with the gfm extension)', () => {
    const tree = (
      <table align={['left', 'right']}>
        <tableRow>
          <tableCell>Name</tableCell>
          <tableCell>Count</tableCell>
        </tableRow>
        <tableRow>
          <tableCell>a</tableCell>
          <tableCell>1</tableCell>
        </tableRow>
      </table>
    )
    const out = toMarkdown(tree, { extensions: [gfmToMarkdown()] })
    expect(out).toContain('| Name')
    expect(out).toContain('Count |')
    expect(out).toMatch(/:-+/) // left-aligned column marker
    expect(out).toMatch(/-+:/) // right-aligned column marker
    expect(out).toContain('| a')
  })

  it('passes raw HTML through via the html node (block and inline)', () => {
    const node = <html value={'<div class="note">hi</div>'} />
    expect(node).toEqual({ type: 'html', value: '<div class="note">hi</div>' })
    expect(toMarkdown(node)).toContain('<div class="note">hi</div>')

    expect(
      toMarkdown(
        <paragraph>
          Press <html value="<kbd>Esc</kbd>" /> to exit
        </paragraph>
      )
    ).toContain('Press <kbd>Esc</kbd> to exit')
  })

  it('rejects invalid usage at compile time (proves the derived types are live)', () => {
    // @ts-expect-error depth must be a number 1-6, not a string
    void (<heading depth="two">x</heading>)
    // @ts-expect-error no such node type
    void (<notARealNode />)
    // @ts-expect-error `code` is a literal: it needs `value` and takes no children
    void (<code>const x = 1</code>)
    // @ts-expect-error `list` has no `depth` prop
    void (<list depth={2} />)
    expect(true).toBe(true)
  })
})
