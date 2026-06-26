import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { highlightMarkdownToHtml } from '@/lib/highlighter'
import type { EditorTheme } from './Editor'

/** Right pane: raw markdown (syntax-highlighted) / rendered preview, plus an error banner. */
export function OutputPane({
  md,
  error,
  theme,
}: {
  md: string
  error: string | null
  theme: EditorTheme
}) {
  const [copied, setCopied] = useState(false)
  const [mdHtml, setMdHtml] = useState('')

  // Syntax-highlight the raw markdown with Shiki (fenced blocks lazy-load grammars).
  useEffect(() => {
    let cancelled = false
    void highlightMarkdownToHtml(md, theme).then((html) => {
      if (!cancelled) setMdHtml(html)
    })
    return () => {
      cancelled = true
    }
  }, [md, theme])

  const copy = async () => {
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Tabs defaultValue="md" className="pane output gap-0">
      <header className="pane-header">
        <TabsList variant="line">
          <TabsTrigger value="md">Markdown</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <Button variant="outline" size="sm" className="ml-auto" onClick={copy} disabled={!md}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </header>
      {error && <pre className="error">{error}</pre>}
      <TabsContent value="md" className="min-h-0 overflow-auto">
        <div className="md" dangerouslySetInnerHTML={{ __html: mdHtml }} />
      </TabsContent>
      <TabsContent value="preview" className="min-h-0 overflow-auto">
        <div className="preview">
          <Markdown remarkPlugins={[remarkGfm]}>{md}</Markdown>
        </div>
      </TabsContent>
    </Tabs>
  )
}
