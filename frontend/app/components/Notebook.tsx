'use client'

import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimeWindowSelector, type TimeWindow } from '@/components/time-window-selector'
import ClientBlockNote from '@/components/ClientBlockNote'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'
import { notebookStorage } from '@/lib/notebook-storage'
import type { NotebookData, TimeWindowConfig, NotebookUpdateInput } from '@/lib/notebook-types'
import { resolveTimeWindow } from '@/lib/notebook-types'
import { ShareNotebook } from './ShareNotebook'

interface NotebookProps {
  notebook: NotebookData | null
  isLoading?: boolean
  isView?: boolean
  onUpdate?: () => void
}

export default function Notebook({ notebook, isLoading = false, isView = false, onUpdate }: NotebookProps) {

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading notebook...</p>
        </div>
      </div>
    )
  }

  // Show 404 if notebook not found
  if (!notebook) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Notebook not found</h1>
          <p className="text-muted-foreground">The notebook you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  // Handlers to update notebook and sync to storage
  const updateNotebook = (updates: NotebookUpdateInput) => {
    const updated = notebookStorage.update(notebook.id, updates)
    if (updated && onUpdate) {
      onUpdate() // Notify parent to refresh
    }
  }

  const handleTitleChange = (newTitle: string) => {
    updateNotebook({ title: newTitle })
  }

  const handleDescriptionChange = (newDescription: string) => {
    updateNotebook({ description: newDescription })
  }

  const handleLockToggle = () => {
    updateNotebook({ locked: !notebook.locked })
  }

  const handleTimeWindowChange = (_timeWindow: TimeWindow, config: TimeWindowConfig) => {
    updateNotebook({
      timeWindow: config,
    })
  }

  const timeWindow = resolveTimeWindow(notebook.timeWindow)

  return (
    <div className="min-h-screen bg-background">
      {/* Header with time window and share */}
      <div className="bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left group: Lock/Unlock */}
          {!isView && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-muted-foreground flex items-center gap-2"
                onClick={handleLockToggle}
              >
                {notebook.locked ? (
                  <>
                    <Lock className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Right group: Time window + Share */}
          <div className={`flex items-center gap-3 ${isView ? 'ml-auto' : ''}`}>
            <TimeWindowSelector
              value={timeWindow}
              config={notebook.timeWindow}
              onChange={handleTimeWindowChange}
            />
            {!isView && (
              <ShareNotebook notebookId={notebook.id} />
            )}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="pl-8 md:pl-8">
          {/* Title */}
          <input
            value={notebook.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={notebook.locked}
            className="w-full text-4xl font-bold border-none outline-none bg-transparent placeholder-muted-foreground disabled:opacity-100 disabled:cursor-default"
            placeholder="Untitled"
          />

          {/* Description */}
          <textarea
            value={notebook.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            disabled={notebook.locked}
            className="mt-2 w-full resize-none border-none outline-none bg-transparent text-sm text-muted-foreground disabled:opacity-100 disabled:cursor-default"
            placeholder={notebook.locked ? "" : "Description..."}
            rows={2}
          />
        </div>

        {/* Editor */}
        <div className="mt-6">
          <EditorErrorBoundary>
            <ClientBlockNote
              timeWindow={timeWindow}
              blockNoteId={notebook.blockNoteId}
              readonly={notebook.locked}
            />
          </EditorErrorBoundary>
        </div>
      </div>
    </div>
  )
}