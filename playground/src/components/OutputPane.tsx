import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type View = 'md' | 'preview'

/** Right pane: raw markdown, rendered preview, or an error banner. */
export function OutputPane({ md, error }: { md: string; error: string | null }) {
  const [view, setView] = useState<View>('md')
  return (
    <section className="pane output">
      <header className="pane-header">
        <button className={view === 'md' ? 'active' : ''} onClick={() => setView('md')}>
          Markdown
        </button>
        <button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>
          Preview
        </button>
      </header>
      {error && <pre className="error">{error}</pre>}
      {view === 'md' ? (
        <pre className="md">{md}</pre>
      ) : (
        <div className="preview">
          <Markdown remarkPlugins={[remarkGfm]}>{md}</Markdown>
        </div>
      )}
    </section>
  )
}
