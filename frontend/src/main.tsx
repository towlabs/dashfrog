import * as React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import '@/app/globals.css'
import LayoutClient from '@/app/components/LayoutClient'
import Home from '@/src/routes/Home'
import EventsPage from '@/src/routes/Events'
import NotebookPage from '@/src/routes/NotebookIndex'
import NotebookById from '@/src/routes/NotebookById'
import CatalogPage from '@/src/routes/Catalog'

const router = createBrowserRouter([
  { path: '/', element: <LayoutClient><Home /></LayoutClient> },
  { path: '/events', element: <LayoutClient><EventsPage /></LayoutClient> },
  { path: '/notebook', element: <LayoutClient><NotebookPage /></LayoutClient> },
  { path: '/notebook/:id', element: <LayoutClient><NotebookById /></LayoutClient> },
  { path: '/catalog', element: <LayoutClient><CatalogPage /></LayoutClient> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
