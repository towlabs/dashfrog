'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ClientBlockNote from '@/components/ClientBlockNote'
import { useNotebookTitle } from './notebook-title-context'

interface NotebookProps {
  title?: string
  description?: string
  isPublic?: boolean
  lastModified?: Date
  author?: string
  onShare?: () => void
}

export default function Notebook({
  title = 'Untitled',
  description = '',
  isPublic = false,
  lastModified = new Date(),
  author = 'John Doe',
  onShare,
}: NotebookProps) {
  const [pageTitle, setPageTitle] = useState(title)
  const [pageDescription, setPageDescription] = useState(description)
  const { setNotebookMeta } = useNotebookTitle()

  return (
    <div className="min-h-screen bg-background">
      {/* Header with share */}
      <div className="bg-background px-6 py-4">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-muted-foreground flex items-center gap-2"
            onClick={onShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="pl-8 md:pl-8">
          {/* Title */}
          <input
            value={pageTitle}
            onChange={(e) => {
              const v = e.target.value
              setPageTitle(v)
              setNotebookMeta(undefined, v)
            }}
            className="w-full text-4xl font-bold border-none outline-none bg-transparent placeholder-muted-foreground"
            placeholder="Untitled"
          />

          {/* Description */}
          <textarea
            value={pageDescription}
            onChange={(e) => setPageDescription(e.target.value)}
            className="mt-2 w-full resize-none border-none outline-none bg-transparent text-sm text-muted-foreground"
            placeholder="Add a description..."
            rows={2}
          />
        </div>

        {/* Editor */}
        <div className="mt-6">
          <ClientBlockNote />
        </div>
      </div>
    </div>
  )
}