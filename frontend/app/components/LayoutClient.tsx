'use client'

import * as React from 'react'
import Header from './Header'
import SideMenu from './SideMenu'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { NotebookTitleProvider } from './notebook-title-context'
import { LabelsProvider } from '@/src/contexts/labels-context'

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  return (
    <LabelsProvider>
      <NotebookTitleProvider>
        <div className="relative flex min-h-screen">
          {/* Desktop Sidebar - Fixed */}
          <SideMenu isCollapsed={sidebarCollapsed} onToggleCollapse={setSidebarCollapsed} />

          {/* Mobile Sidebar */}
          <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DrawerContent side="left" className="p-0">
              <SideMenu />
            </DrawerContent>
          </Drawer>

          {/* Main Content - With left margin to account for fixed sidebar */}
          <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
            <Header onMenuClick={() => setMobileMenuOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </NotebookTitleProvider>
    </LabelsProvider>
  )
}