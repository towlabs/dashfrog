'use client'

import { ListFilter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AddFilterDropdownProps {
  onAddFilter: (column: string) => void
  availableColumns: { value: string; label: string }[]
}

export function AddFilterDropdown({ onAddFilter, availableColumns }: AddFilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 border-0 bg-transparent text-muted-foreground">
          <ListFilter className="h-4 w-4" />
          Filter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b">
          Filter by label
        </div>
        {availableColumns.map((column) => (
          <DropdownMenuItem
            key={column.value}
            onClick={() => onAddFilter(column.value)}
            className="text-sm"
          >
            {column.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}