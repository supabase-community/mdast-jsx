const RELEASE_NOTES = `import { toMarkdown } from 'mdast-util-to-markdown'
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

export default toMarkdown(<ReleaseNotes />, { extensions: [gfmToMarkdown()] })
`

const USAGE_TABLE = `import { toMarkdown } from 'mdast-util-to-markdown'
import { gfmToMarkdown } from 'mdast-util-gfm'

const rows = [
  { user: 'Acme', plan: 'Pro', seats: 12 },
  { user: 'Globex', plan: 'Free', seats: 1 },
]

const Usage = () => (
  <table align={['left', 'left', 'right']}>
    <tableRow>
      <tableCell>User</tableCell>
      <tableCell>Plan</tableCell>
      <tableCell>Seats</tableCell>
    </tableRow>
    {rows.map((r) => (
      <tableRow>
        <tableCell>{r.user}</tableCell>
        <tableCell>{r.plan}</tableCell>
        <tableCell>{String(r.seats)}</tableCell>
      </tableRow>
    ))}
  </table>
)

export default toMarkdown(<Usage />, { extensions: [gfmToMarkdown()] })
`

const LLM_CONTEXT = `import { toMarkdown } from 'mdast-util-to-markdown'

const order = {
  id: 'A-1042',
  customer: 'Sam',
  items: [
    { name: 'Keyboard', qty: 1, price: 80 },
    { name: 'Mouse', qty: 2, price: 25 },
  ],
}

const Context = () => (
  <>
    <heading depth={1}>Order {order.id}</heading>
    <paragraph>
      Customer: <strong>{order.customer}</strong>
    </paragraph>
    <list>
      {order.items.map((i) => (
        <listItem>
          <paragraph>
            {i.name} x{i.qty} - \${i.price}
          </paragraph>
        </listItem>
      ))}
    </list>
  </>
)

// Feed this markdown straight to an LLM.
export default toMarkdown(<Context />)
`

/** Starter examples; index 0 is the default shown on load. */
export const PRESETS: { name: string; code: string }[] = [
  { name: 'Release notes', code: RELEASE_NOTES },
  { name: 'Usage table', code: USAGE_TABLE },
  { name: 'LLM context', code: LLM_CONTEXT },
]
