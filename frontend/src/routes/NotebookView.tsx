import Notebook from '@/app/components/Notebook'
import { Navigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { notebookStorage } from '@/lib/notebook-storage'
import type { NotebookData } from '@/lib/notebook-types'

export default function NotebookView() {
  const { viewId } = useParams<{ viewId: string }>()
  const [notebook, setNotebook] = useState<NotebookData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!viewId) return

    const loadNotebook = async () => {
      setIsLoading(true)
      try {
        // Load notebook using loadView method
        const loaded = notebookStorage.loadView(viewId)
        setNotebook(loaded)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotebook()
  }, [viewId])

  if (!viewId) {
    return <Navigate to="/" />
  }

  // Render notebook without any layout
  return <Notebook notebook={notebook} isLoading={isLoading} isView={true} />
}
