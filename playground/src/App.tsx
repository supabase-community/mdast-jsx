import { useEffect, useState } from 'react'
import type { QuickJSWASMModule } from 'quickjs-emscripten'
import { Editor } from './components/Editor'
import { OutputPane } from './components/OutputPane'
import { runTsx } from './lib/run-tsx'
import { PRESETS } from './presets'

export function App({
  QuickJS,
  vmModules,
}: {
  QuickJS: QuickJSWASMModule
  vmModules: Record<string, string>
}) {
  const [code, setCode] = useState(PRESETS[0].code)
  const [md, setMd] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      const result = runTsx(code, { QuickJS, vmModules })
      if (result.ok) {
        setMd(result.md)
        setError(null)
      } else {
        setError(result.error)
      }
    }, 300)
    return () => clearTimeout(id)
  }, [code, QuickJS, vmModules])

  return (
    <div className="app">
      <header className="toolbar">
        <strong>mdast-jsx</strong>
        <select onChange={(e) => setCode(PRESETS[Number(e.target.value)].code)} defaultValue="0">
          {PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name}
            </option>
          ))}
        </select>
      </header>
      <div className="panes">
        <section className="pane">
          <Editor value={code} onChange={setCode} />
        </section>
        <OutputPane md={md} error={error} />
      </div>
    </div>
  )
}
