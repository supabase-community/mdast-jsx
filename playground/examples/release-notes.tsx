import { toMarkdown } from 'mdast-util-to-markdown'
import { gfmToMarkdown } from 'mdast-util-gfm'

type PR = { title: string; author: string; n: number; type: 'feat' | 'fix' }

const merged: PR[] = [
  { title: 'Dark mode', author: 'sam', n: 412, type: 'feat' },
  { title: 'Stripe webhooks', author: 'lee', n: 415, type: 'feat' },
  { title: 'Timezone off-by-one', author: 'sam', n: 418, type: 'fix' },
]

// Empty groups return null, so their heading disappears - no dangling section.
const Section = ({ title, prs }: { title: string; prs: PR[] }) =>
  prs.length === 0 ? null : (
    <>
      <heading depth={3}>{title}</heading>
      <list>
        {prs.map((pr) => (
          <listItem>
            <paragraph>
              {pr.title} by @{pr.author} (#{pr.n})
            </paragraph>
          </listItem>
        ))}
      </list>
    </>
  )

const ReleaseNotes = () => (
  <>
    <heading depth={2}>v2.1.0</heading>
    <Section title="Features" prs={merged.filter((p) => p.type === 'feat')} />
    <Section title="Bug fixes" prs={merged.filter((p) => p.type === 'fix')} />
  </>
)

export default toMarkdown(<ReleaseNotes />, {
  bullet: '-',
  listItemIndent: 'one',
  extensions: [gfmToMarkdown()],
})
