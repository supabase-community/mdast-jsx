import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import typeDefs from 'virtual:mdast-type-defs'

/** Monaco configured so mdast-jsx JSX type-checks against the mdast schema. */
export function Editor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handleMount: OnMount = (_editor, monaco) => {
    // Expose monaco globally for programmatic marker checks (e.g. e2e tests).
    ;(globalThis as unknown as Record<string, unknown>).monaco = monaco

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
  }

  return (
    <MonacoEditor
      language="typescript"
      path="file:///input.tsx"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
    />
  )
}
