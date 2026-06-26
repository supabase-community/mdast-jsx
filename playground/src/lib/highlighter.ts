import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import { bundledLanguages } from 'shiki'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Root, RootContent } from 'mdast'
import tsxGrammar from 'shiki/langs/tsx.mjs'
import markdownGrammar from 'shiki/langs/markdown.mjs'
import darkPlus from 'shiki/themes/dark-plus.mjs'
import lightPlus from 'shiki/themes/light-plus.mjs'

/**
 * One Shiki highlighter shared by the editor (via @shikijs/monaco) and the raw
 * markdown output pane. Fine-grained bundle: only the `tsx` + `markdown` grammars
 * and the two VS Code themes. The `tsx` grammar is registered under the id
 * `typescript` so Monaco's `typescript` model is colored with JSX-aware rules.
 */
export const highlighterPromise = (async () => {
  const tsx = structuredClone(tsxGrammar) as unknown as { name: string }[]
  tsx[0].name = 'typescript'
  return createHighlighterCore({
    themes: [darkPlus, lightPlus],
    langs: [tsx, markdownGrammar],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  })
})()

/** Collect the languages of fenced code blocks by parsing the markdown to mdast. */
function fencedLanguages(md: string): Set<string> {
  const langs = new Set<string>()
  const visit = (node: Root | RootContent) => {
    if (node.type === 'code' && node.lang) langs.add(node.lang.toLowerCase())
    if ('children' in node) for (const child of node.children) visit(child)
  }
  visit(fromMarkdown(md))
  return langs
}

/**
 * Highlight a markdown string. Fenced code blocks are sub-highlighted by language,
 * lazy-loading each grammar on demand - so a `python` grammar is fetched only when
 * the output actually contains a ```python block (and only once).
 */
export async function highlightMarkdownToHtml(md: string, theme: string): Promise<string> {
  const highlighter = await highlighterPromise
  const loaded = new Set(highlighter.getLoadedLanguages())
  const toLoad = [...fencedLanguages(md)].filter((l) => !loaded.has(l) && l in bundledLanguages)
  if (toLoad.length) {
    await Promise.all(
      toLoad.map((l) => highlighter.loadLanguage(bundledLanguages[l as keyof typeof bundledLanguages])),
    )
  }
  return highlighter.codeToHtml(md, { lang: 'markdown', theme })
}
