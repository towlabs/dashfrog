'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Search,
  ChartNoAxesGantt,
  ChartScatter,
  RadioTower,
  Hash,
  Settings,
  Home
} from 'lucide-react'

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const searchItems = [
  {
    group: 'Navigation',
    items: [
      { id: 'home', title: 'Home', icon: Home, href: '/' },
      { id: 'settings', title: 'Settings', icon: Settings, href: '/settings' },
    ]
  },
  {
    group: 'Building blocks',
    items: [
      { id: 'flows', title: 'Flows', icon: ChartNoAxesGantt, href: '/flows' },
      { id: 'observations', title: 'Observables', icon: ChartScatter, href: '/observations' },
      { id: 'events', title: 'Events', icon: RadioTower, href: '/events' },
    ]
  },
  {
    group: 'Teamspaces',
    items: [
      { id: 'engineering', title: 'Engineering', icon: Hash, href: '/teamspaces/engineering' },
      { id: 'product', title: 'Product', icon: Hash, href: '/teamspaces/product' },
      { id: 'performance', title: 'Performance Dashboard', icon: Hash, href: '/teamspaces/engineering/performance' },
      { id: 'errors', title: 'Error Tracking', icon: Hash, href: '/teamspaces/engineering/errors' },
      { id: 'analytics', title: 'User Analytics', icon: Hash, href: '/teamspaces/product/analytics' },
      { id: 'conversion', title: 'Conversion Dashboard', icon: Hash, href: '/teamspaces/product/conversion' },
    ]
  }
]

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const handleSelect = (href: string) => {
    onOpenChange(false)
    window.location.href = href
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search for pages, features, or teamspaces..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {searchItems.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item.href)}
                  className="flex items-center gap-3"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}