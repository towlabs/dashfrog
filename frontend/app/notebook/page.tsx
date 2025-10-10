import Notebook from '@/app/components/Notebook'

export default function NotebookPage() {
  return (
    <Notebook
      title="My Research Notebook"
      author="John Doe"
      lastModified={new Date()}
      isPublic={false}
    />
  )
}