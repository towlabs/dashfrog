'use client'

import * as React from 'react'
import Header from './Header'
import SideMenu from './SideMenu'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { NotebookTitleProvider } from './notebook-title-context'

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <NotebookTitleProvider>
      <div className="relative flex min-h-screen">
        {/* Desktop Sidebar */}
        <SideMenu />

        {/* Mobile Sidebar */}
        <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DrawerContent side="left" className="p-0">
            <SideMenu />
          </DrawerContent>
        </Drawer>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          <Header onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </NotebookTitleProvider>
  )
}