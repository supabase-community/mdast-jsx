import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'

// A reusable doc snippet, authored as plain markdown (could come from a file,
// a CMS, an API, an LLM...).
const snippet = `## Install

Add the package with your favorite package manager.

## Usage

- Import the library
- Call render() with your data`

// A reusable component: parse markdown and optionally demote its headings so it
// nests under the host section instead of colliding with its levels. Try doing
// THIS with string concatenation - with an AST it's just a map.
const Include = ({ value, shiftHeadings = 0 }: { value: string; shiftHeadings?: number }) => {
  const doc = fromMarkdown(value)
  doc.children = doc.children.map((node) =>
    node.type === 'heading'
      ? { ...node, depth: Math.min(6, node.depth + shiftHeadings) as typeof node.depth }
      : node,
  )
  return doc
}

const Page = () => (
  <>
    <heading depth={1}>My Project</heading>
    <paragraph>Intro generated here, then a reusable snippet slotted in:</paragraph>
    <heading depth={2}>Getting started</heading>
    <Include value={snippet} shiftHeadings={1} />
  </>
)

export default toMarkdown(<Page />, { bullet: '-', listItemIndent: 'one' })
