import './monaco-setup' // self-host Monaco (must run before the editor loads)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { newQuickJSWASMModuleFromVariant, newVariant } from 'quickjs-emscripten-core'
import releaseSync from '@jitl/quickjs-wasmfile-release-sync'
// Vite resolves ?url to the emitted .wasm asset URL (honors the /mdast-jsx/ base);
// pass it to the variant so the separate .wasm loads correctly under Vite.
import wasmLocation from '@jitl/quickjs-wasmfile-release-sync/wasm?url'
import vmModules from 'virtual:vm-modules'
import { App } from './App'
import './index.css'
import './App.css'

const QuickJS = await newQuickJSWASMModuleFromVariant(newVariant(releaseSync, { wasmLocation }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App QuickJS={QuickJS} vmModules={vmModules} />
  </StrictMode>,
)
