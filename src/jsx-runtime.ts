/**
 * Minimal JSX runtime that builds mdast nodes.
 *
 * - lowercase tag        -> mdast node of that `type`; props become node fields
 * - Capitalized tag (fn) -> called as a component, returns node(s)
 * - bare string children -> `text` nodes
 * - `value` (code, inlineCode, html, yaml) is a normal prop, so literal nodes
 *   are self-closing and can't receive invalid element children
 *
 * Opt in per file with both pragmas:
 *   /** @jsxRuntime automatic *\/
 *   /** @jsxImportSource mdast-jsx *\/
 */

import type { Content, Root } from 'mdast'

type AnyNode = Root | Content

export const Fragment = Symbol.for('mdast.fragment')

type Props = Record<string, unknown> & { children?: unknown }

/** Flatten children, drop falsy, wrap bare strings as `text` nodes. */
function normalizeChildren(children: unknown): Content[] {
  const out: Content[] = []
  const walk = (c: unknown): void => {
    if (c == null || c === false || c === true) return
    if (Array.isArray(c)) return void c.forEach(walk)
    if (typeof c === 'string' || typeof c === 'number') {
      const value = String(c)
      if (value !== '') out.push({ type: 'text', value } as Content)
      return
    }
    // Flatten nested Fragments (which produce `root` nodes) so they're
    // transparent, the way React Fragments are - otherwise `map(() => <>…</>)`
    // would nest invalid `root` nodes inside the tree.
    if (typeof c === 'object' && (c as { type?: string }).type === 'root') {
      return void walk((c as { children: unknown[] }).children)
    }
    out.push(c as Content)
  }
  walk(children)
  return out
}

export function jsx(type: unknown, props: Props): AnyNode {
  if (type === Fragment) {
    return { type: 'root', children: normalizeChildren(props.children) } as AnyNode
  }
  if (typeof type === 'function') {
    return (type as (p: Props) => AnyNode)(props)
  }
  const { children, ...fields } = props
  const node: Record<string, unknown> = { type, ...fields }
  if (children !== undefined) node.children = normalizeChildren(children)
  return node as unknown as AnyNode
}

// jsxs handles static children; same impl (we flatten children regardless).
export const jsxs = jsx

// ---- Types, derived from @types/mdast so the tag set is never hand-maintained ----

// Recursive so `{items.map(...)}` (an array) and nested arrays are valid
// children, the same way React's ReactNode is recursive.
type Child = AnyNode | string | number | boolean | null | undefined | Child[]

type PropsOf<N> = Omit<N, 'type' | 'position' | 'children'> &
  (N extends { children: unknown[] } ? { children?: Child } : object)

export namespace JSX {
  export type Element = AnyNode
  export interface ElementChildrenAttribute {
    children: unknown
  }
  export type IntrinsicElements = {
    [N in AnyNode as N['type']]: PropsOf<N>
  }
}
