import { useEffect, useState } from 'react'
import type { QuickJSWASMModule } from 'quickjs-emscripten-core'
import { FileCode, Monitor, Moon, Sun } from 'lucide-react'
import vmModules from 'virtual:vm-modules'
import { Editor } from './components/Editor'
import { OutputPane } from './components/OutputPane'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { runTsx } from './lib/run-tsx'
import { loadQuickJS } from './lib/quickjs'
import { PRESETS } from './presets'

type ThemePref = 'system' | 'light' | 'dark'

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const

export function App() {
  const [QuickJS, setQuickJS] = useState<QuickJSWASMModule | null>(null)
  const [preset, setPreset] = useState('0')
  const [code, setCode] = useState(PRESETS[0].code)
  const [md, setMd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [themePref, setThemePref] = useState<ThemePref>('system')
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  const isDark = themePref === 'system' ? systemDark : themePref === 'dark'
  const editorTheme = isDark ? 'dark-plus' : 'light-plus'
  const ThemeIcon = THEME_ICON[themePref]

  // Instantiate the sandbox VM (async, once) after mount.
  useEffect(() => {
    let active = true
    void loadQuickJS().then((mod) => {
      if (active) setQuickJS(mod)
    })
    return () => {
      active = false
    }
  }, [])

  // Re-run the user's code (debounced) once the VM is ready.
  useEffect(() => {
    if (!QuickJS) return
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
  }, [code, QuickJS])

  // Follow the OS theme while the preference is "system".
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Drive shadcn's dark mode (and the portaled dropdowns) from the resolved theme.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <div className="app" data-theme={isDark ? 'dark' : 'light'}>
      <header className="toolbar">
        <strong>mdast-jsx</strong>

        <Select
          value={preset}
          onValueChange={(value) => {
            setPreset(value)
            setCode(PRESETS[Number(value)].code)
          }}
        >
          <SelectTrigger size="sm" className="w-auto" aria-label="Load an example">
            <FileCode className="size-4 opacity-70" />
            Examples
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p, i) => (
              <SelectItem key={p.name} value={String(i)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="toolbar-spacer" />

        <Button variant="link" size="sm" asChild>
          <a
            href="https://github.com/supabase-community/mdast-jsx"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </Button>
        <Button variant="link" size="sm" asChild>
          <a href="https://www.npmjs.com/package/mdast-jsx" target="_blank" rel="noreferrer">
            npm
          </a>
        </Button>

        <Select value={themePref} onValueChange={(value) => setThemePref(value as ThemePref)}>
          <SelectTrigger size="sm" className="w-auto px-2" aria-label="Theme">
            <ThemeIcon className="size-4" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="system">
              <Monitor className="size-4" />
              System
            </SelectItem>
            <SelectItem value="light">
              <Sun className="size-4" />
              Light
            </SelectItem>
            <SelectItem value="dark">
              <Moon className="size-4" />
              Dark
            </SelectItem>
          </SelectContent>
        </Select>
      </header>
      <div className="panes">
        <section className="pane">
          <Editor value={code} onChange={setCode} theme={editorTheme} />
        </section>
        <OutputPane md={md} error={error} theme={editorTheme} />
      </div>
    </div>
  )
}
