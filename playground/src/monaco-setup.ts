import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { loader } from '@monaco-editor/react'
import type { Environment } from 'monaco-editor'

// Self-host Monaco from local node_modules instead of @monaco-editor/react's
// default jsdelivr CDN. We only use the editor + the TypeScript language service,
// so just those two workers are wired up (Vite bundles them via `?worker`).
const env: Environment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}
;(self as unknown as { MonacoEnvironment: Environment }).MonacoEnvironment = env

loader.config({ monaco })
