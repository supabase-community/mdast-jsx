import { toMarkdown } from 'mdast-util-to-markdown'

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
            {i.name} x{i.qty} - ${i.price}
          </paragraph>
        </listItem>
      ))}
    </list>
  </>
)

// Feed this markdown straight to an LLM.
export default toMarkdown(<Context />, { bullet: '-', listItemIndent: 'one' })
