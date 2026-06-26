import './monaco-setup' // self-host Monaco (must run before the editor loads)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { newQuickJSWASMModule } from 'quickjs-emscripten'
import variant from '@jitl/quickjs-singlefile-browser-release-sync'
import vmModules from 'virtual:vm-modules'
import { App } from './App'
import './index.css'
import './App.css'

const QuickJS = await newQuickJSWASMModule(variant)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App QuickJS={QuickJS} vmModules={vmModules} />
  </StrictMode>,
)
