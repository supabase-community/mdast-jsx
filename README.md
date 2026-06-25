# mdast-jsx

A tiny JSX runtime that builds [mdast](https://github.com/syntax-tree/mdast) (markdown AST) nodes, so that you can author markdown using JSX.

```tsx
/** @jsxRuntime automatic */
/** @jsxImportSource mdast-jsx */

import { toMarkdown } from 'mdast-util-to-markdown';

toMarkdown(
  <>
    <heading depth={2}>Release notes</heading>
    <paragraph>
      Bumped to <inlineCode value="v2.0.0" />.
    </paragraph>
  </>,
);
```

produces:

```md
## Release notes

Bumped to `v2.0.0`.
```

## Why?

Up until now markdown has been a source format - something you write, not something you generate. But AI is changing that - agents often prefer markdown because it's terse and token efficient, so we increasingly want to generate it as the final output for LLMs to consume.

None of this matters when the markdown is static - if you're hand-writing prose, just write a `.md` file. JSX becomes attractive when the markdown is dynamic, built from data with loops and conditions. A common scenario is an existing data-driven React page that you want to render as markdown (e.g. a dynamic list of clients pulled from a DB) - the same component logic, just producing markdown instead of DOM.

### Why not string concatenation?

You could dynamically build markdown using string concatenation, but you end up hand-managing markdown's whitespace and escaping rules, which is easy to get subtly wrong. More importantly, you lose type safety - a malformed structure shows up as broken output, not as an error while you're writing it.

### Why not object notation?

You could instead build the markdown AST nodes by hand with object notation, but the DX is pretty poor (less readable, harder to maintain):

```ts
{ type: 'heading', depth: 2, children: [{ type: 'text', value: 'Setup' }] }
```

JSX is the perfect tool for the job - markdown is a tree, and JSX is just a syntax for building trees. It's the same AST node but written the way you'd write any markup:

```tsx
<heading depth={2}>Setup</heading>
```

You keep the serializer's correctness and get JSX's ergonomics on top:

```tsx
<>
  <heading depth={4}>{group.heading}</heading>
  {group.keys.map((key) => (
    <Client client={clientsByKey.get(key)} />
  ))}
  {isHosted && (
    <paragraph>Authenticate in your browser on first use.</paragraph>
  )}
</>
```

Because it's JSX, you get the usual tooling for free - loop with `.map`, branch with `&&` or ternaries, factor out reusable components - all type-checked against the markdown schema (i.e. `<heading>` requires `depth`, `<code>` can't take children, an unknown tag won't compile).

### Why not just HTML?

A reasonable alternative is to render the components to HTML (they're JSX after all) and convert that to markdown with rehype-remark or turndown. The problem is that HTML can express more than markdown can, so converting back is lossy - the converter has to guess how to represent things that have no markdown equivalent, and code blocks in particular come back as messy `<span>` markup. It's also more steps (JSX -> HTML -> parse -> markdown -> stringify) and you lose type safety on the markdown you actually emit. Going straight to mdast avoids all of that: you stay in markdown the whole time and can only produce valid markdown.

## Install

```shell
npm i mdast-jsx
```

```shell
pnpm add mdast-jsx
```

## Usage

Add the following pragmas to the top of your `.tsx` file, then write components (functions) that return mdast nodes:

```tsx
/** @jsxRuntime automatic */
/** @jsxImportSource mdast-jsx */

export const MyComponent = () => (
  <>
    <heading depth={2}>Title</heading>
    <paragraph>Body text.</paragraph>
  </>
);
```

The pragmas are per-file comments the compiler reads (or set `jsxImportSource: "mdast-jsx"` in your tsconfig to apply it everywhere):

- `@jsxRuntime automatic` compiles JSX into `jsx(...)` calls (the modern transform) instead of `React.createElement`.
- `@jsxImportSource mdast-jsx` points those calls at this runtime, so `<heading />` builds an mdast node instead of a React element.

### Rendering to markdown

The JSX just returns mdast nodes, so serialize them with [`mdast-util-to-markdown`](https://github.com/syntax-tree/mdast-util-to-markdown):

```tsx
import { toMarkdown } from 'mdast-util-to-markdown';

const md = toMarkdown(MyComponent());
// "## Title\n\nBody text.\n"
```

For GitHub-flavored markdown (tables, strikethrough, task lists), add the gfm extension:

```tsx
import { gfmToMarkdown } from 'mdast-util-gfm';

const md = toMarkdown(
  <table align={['left', 'right']}>
    <tableRow>
      <tableCell>Name</tableCell>
      <tableCell>Count</tableCell>
    </tableRow>
    <tableRow>
      <tableCell>a</tableCell>
      <tableCell>1</tableCell>
    </tableRow>
  </table>,
  { extensions: [gfmToMarkdown()] },
);
```

produces:

```md
| Name | Count |
| :--- | ----: |
| a    |     1 |
```

### Compiling

This is a standard automatic JSX runtime: if a tool can compile React's automatic runtime, it can compile this - the only difference is `jsxImportSource`. You opt in either with the per-file pragmas shown above, or once for the whole project with `jsxImportSource: "mdast-jsx"` (and `jsx: "react-jsx"`) in your tsconfig.

> Note this doesn't use React - the JSX is just syntax the compiler turns into plain mdast objects. `react-jsx` is a legacy name for the `automatic` transform, not a React dependency.

In practice you will:

- **Just run it** - `tsx file.tsx` or `bun file.tsx` execute `.tsx` directly with the transform included; the fastest way to try it.
- **Compile in a project** - tsc (set `jsx: "react-jsx"` to emit runnable `jsx()` calls), esbuild, and Babel all support the automatic runtime and `jsxImportSource`, via their config or the pragmas. (With tsc's `jsx: "preserve"` the JSX is emitted untransformed for a downstream tool, so pair it with a runner or bundler.)
- **Use Vite / Vitest** - needs no JSX-specific config: both read `jsx` and `jsxImportSource` from your tsconfig and honor the per-file pragmas, regardless of the underlying transformer (esbuild on Vite ≤7 / Vitest ≤3, Oxc on Vite 8 / Vitest 4).

## How it maps to mdast

The JSX is almost a direct reflection of mdast. A lowercase tag becomes a node of that `type`, props become the node's fields, and children become its `children`:

```tsx
<heading depth={2}>Setup</heading>
// { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Setup' }] }
```

Bare strings become `text` nodes, and inline elements nest the way you'd expect:

```tsx
<paragraph>
  Run <inlineCode value="npm i" /> to install.
</paragraph>
// {
//   type: 'paragraph',
//   children: [
//     { type: 'text', value: 'Run ' },
//     { type: 'inlineCode', value: 'npm i' },
//     { type: 'text', value: ' to install.' },
//   ],
// }
```

If you're ever unsure which tags are available or how to use them, check the [mdast schema](https://github.com/syntax-tree/mdast#nodes).

A few rules cover the spots where mdast isn't perfectly uniform:

- **Literal nodes** (`code`, `inlineCode`, `html`, `yaml`) hold their content in a `value` field, not children, so they're self-closing and take a `value` prop:

  ```tsx
  <code lang="bash" value="npm run build" />
  // { type: 'code', lang: 'bash', value: 'npm run build' }
  ```

- **Capitalized tags are components** - called as functions, exactly like React:

  ```tsx
  const Item = ({ label }) => (
    <listItem>
      <paragraph>{label}</paragraph>
    </listItem>
  );
  ```

- **Fragments (`<>`) become a `root`** and flatten when nested, so `.map` drops in cleanly:

  ```tsx
  <root>
    {items.map((i) => (
      <paragraph>{i}</paragraph>
    ))}
  </root>
  ```

- `null` / `false` / whitespace-only children are dropped, so `{cond && <x />}` does the obvious thing.

### HTML

Markdown allows raw HTML for the things it can't express on its own - collapsible `<details>`, sized or aligned images, and so on. mdast represents that HTML as a single opaque `html` node (a literal string it never parses into a tree), so you do the same here: pass the markup as a `value` and it's emitted verbatim.

```tsx
<html value="<details><summary>Show more</summary>...</details>" />
```

There are no native `<span>`, `<div>`, etc. tags, because those aren't mdast nodes - anything markdown can't express goes through `<html>` as a string.

If you want to _nest markdown_ inside an HTML block (e.g. a collapsible `<details>`), split the open and close tags into their own `html` nodes and place mdast nodes between them:

```tsx
<>
  <html value="<details><summary>Details</summary>" />
  <paragraph>
    Real <strong>markdown</strong> inside.
  </paragraph>
  <html value="</details>" />
</>
```

```md
<details><summary>Details</summary>

Real **markdown** inside.

</details>
```

The blank lines are what matter here - the serializer adds them between block siblings, and a blank line inside an HTML block is what tells the final renderer (GitHub, etc) to parse the content between the tags as markdown rather than literal text. (Note: `\n` in a plain attribute string is literal; use `value={'...\n...'}` if you need actual newlines.)

## Maintenance

mdast-jsx is just a thin wrapper around mdast. It has almost no knowledge of markdown itself - the core is essentially:

```ts
function jsx(type, props) {
  if (typeof type === 'function') return type(props); // a component
  const { children, ...fields } = props;
  return { type, ...fields, children: normalize(children) }; // an mdast node
}
```

It simply builds an object with the right node shape, and the type system ensures that the shape is correct.

`normalize` is the only other moving part - it flattens arrays/fragments, drops falsy children, and wraps bare strings as `text` nodes. Notably there's no reconciliation, no state, no lifecycle. Those exist in React to keep a live UI in sync over time; here we build a tree once and serialize it, so none of it applies.

The element types aren't hand-maintained either - they're derived from `@types/mdast` with a mapped type, so the set of usable tags _is_ the mdast node set and stays in sync on its own.

## License

MIT
