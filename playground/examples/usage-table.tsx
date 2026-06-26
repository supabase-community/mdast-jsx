import { toMarkdown } from 'mdast-util-to-markdown'
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

export default toMarkdown(<Usage />, {
  bullet: '-',
  listItemIndent: 'one',
  extensions: [gfmToMarkdown()],
})
