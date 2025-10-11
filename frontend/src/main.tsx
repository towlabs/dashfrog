import * as React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import '@/app/globals.css'
import LayoutClient from '@/app/components/LayoutClient'
import Home from '@/src/routes/Home'
import EventsPage from '@/src/routes/Events'
import NotebookById from '@/src/routes/NotebookById'
import NotebookView from '@/src/routes/NotebookView'
import CatalogPage from '@/src/routes/Catalog'
import LabelsPage from '@/src/routes/Labels'

const router = createBrowserRouter([
  { path: '/', element: <LayoutClient><Home /></LayoutClient> },
  { path: '/events', element: <LayoutClient><EventsPage /></LayoutClient> },
  { path: '/notebook/:id', element: <LayoutClient><NotebookById /></LayoutClient> },
  { path: '/view/:viewId', element: <NotebookView /> },
  { path: '/catalog', element: <LayoutClient><CatalogPage /></LayoutClient> },
  { path: '/labels', element: <LayoutClient><LabelsPage /></LayoutClient> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
