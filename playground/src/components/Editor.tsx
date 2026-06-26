import { useEffect, useState } from 'react'
import MonacoEditor, { loader, type Monaco } from '@monaco-editor/react'
import typeDefs from 'virtual:mdast-type-defs'
import { bundledLanguages, createHighlighter } from 'shiki'
import { shikiToMonaco } from '@shikijs/monaco'

export type EditorTheme = 'dark-plus' | 'light-plus'

/**
 * Highlighter built once and reused. We load the `tsx` TextMate grammar but
 * register it under the id `typescript`, so Monaco's `typescript` model (which
 * the TS language service needs for diagnostics) is colored with the tsx grammar
 * - i.e. JSX, including lowercase intrinsic tags, highlights exactly like VS Code.
 */
const highlighterPromise = (async () => {
  const tsx = structuredClone((await bundledLanguages.tsx()).default) as { name: string }[]
  tsx[0].name = 'typescript'
  return createHighlighter({ themes: ['dark-plus', 'light-plus'], langs: [tsx] })
})()

let wired = false
/**
 * Configure Monaco's TS service and wire up Shiki highlighting exactly once,
 * before the editor renders. Done up front (not in onMount) because once Shiki
 * hijacks `monaco.editor.setTheme` it only accepts its own themes - so the
 * editor must never be handed a built-in theme name.
 */
async function setupMonaco(): Promise<Monaco> {
  const monaco = await loader.init()
  if (!wired) {
    wired = true
    const ts = monaco.languages.typescript.typescriptDefaults
    ts.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      jsxImportSource: 'mdast-jsx',
      strict: true,
      allowNonTsExtensions: true,
      skipLibCheck: true,
    })
    for (const { filePath, content } of typeDefs) ts.addExtraLib(content, filePath)
    shikiToMonaco(await highlighterPromise, monaco)
    // Expose monaco globally for programmatic marker checks (e.g. e2e tests).
    ;(globalThis as unknown as Record<string, unknown>).monaco = monaco
  }
  return monaco
}

/** Monaco editor with VS Code-accurate highlighting and live mdast type-checking. */
export function Editor({
  value,
  onChange,
  theme,
}: {
  value: string
  onChange: (v: string) => void
  theme: EditorTheme
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void setupMonaco().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return <div className="editor-loading">Loading editor…</div>

  return (
    <MonacoEditor
      language="typescript"
      path="file:///input.tsx"
      theme={theme}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
    />
  )
}
