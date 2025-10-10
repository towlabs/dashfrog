'use client'

import { createContext, useContext, useMemo, useState } from 'react'

type NotebookTitleState = {
  currentNotebookId?: string
  currentNotebookTitle?: string
  setNotebookMeta: (id?: string, title?: string) => void
}

const NotebookTitleContext = createContext<NotebookTitleState | undefined>(undefined)

export function NotebookTitleProvider({ children }: { children: React.ReactNode }) {
  const [currentNotebookId, setCurrentNotebookId] = useState<string | undefined>(undefined)
  const [currentNotebookTitle, setCurrentNotebookTitle] = useState<string | undefined>(undefined)

  const value = useMemo<NotebookTitleState>(() => ({
    currentNotebookId,
    currentNotebookTitle,
    setNotebookMeta: (id?: string, title?: string) => {
      setCurrentNotebookId(id)
      setCurrentNotebookTitle(title)
    },
  }), [currentNotebookId, currentNotebookTitle])

  return (
    <NotebookTitleContext.Provider value={value}>
      {children}
    </NotebookTitleContext.Provider>
  )
}

export function useNotebookTitle() {
  const ctx = useContext(NotebookTitleContext)
  if (!ctx) throw new Error('useNotebookTitle must be used within NotebookTitleProvider')
  return ctx
}
