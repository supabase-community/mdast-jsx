import releaseNotes from '../examples/release-notes.tsx?raw'
import usageTable from '../examples/usage-table.tsx?raw'
import llmContext from '../examples/llm-context.tsx?raw'
import embedMarkdown from '../examples/embed-markdown.tsx?raw'

/**
 * Starter examples shown in the playground's picker; index 0 is the default.
 * The source lives in ../examples/*.tsx (real, formatted, type-checked files)
 * and is loaded as raw strings at build time via Vite's `?raw`.
 */
export const PRESETS: { name: string; code: string }[] = [
  { name: 'Release notes', code: releaseNotes },
  { name: 'Usage table', code: usageTable },
  { name: 'LLM context', code: llmContext },
  { name: 'Embed markdown', code: embedMarkdown },
]
