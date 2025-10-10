import Notebook from '@/app/components/Notebook'
import { useParams } from 'react-router-dom'

export default function NotebookById() {
  const { id } = useParams<{ id: string }>()
  return (
    <Notebook title={id ? 'Untitled' : 'Untitled'} description="" />
  )
}


