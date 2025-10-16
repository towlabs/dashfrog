'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AddFilterDropdown, type ValueOption } from '@/components/add-filter-dropdown'
import { FilterTag } from '@/components/filter-tag'

interface Filter {
  id: string
  column: string
  operator: 'equals' | 'contains' | 'starts_with' | 'not_equals' | 'less_than' | 'greater_than' | 'in' | 'not_in'
  value: string
}

export const op_to_request = {
    'equals': '=',
    'not_equals': '!=',
    'contains': 'like',
    'starts_with': 'like_start',
    'in': 'in',
    'not_in': 'not in',
    'less_than': '<=',
    'greater_than': '>=',
}

interface FilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters: Filter[]
  onFiltersChange: (filters: Filter[]) => void
  availableColumns: { value: string; label: string; description?: string }[]
  getValueOptions?: (column: string) => ValueOption[]
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  onFiltersChange,
  availableColumns,
  getValueOptions
}: FilterBarProps) {
  const [showSearchInput, setShowSearchInput] = useState(false)

  const handleUpdateFilter = (updatedFilter: Filter) => {
    onFiltersChange(filters.map(f => f.id === updatedFilter.id ? updatedFilter : f))
  }

  const handleRemoveFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id))
  }

  const handleAddFilter = (column: string, operator: Filter['operator'], value: string) => {
    const newFilter: Filter = {
      id: `${column}-${Date.now()}`,
      column,
      operator,
      value
    }
    onFiltersChange([...filters, newFilter])
  }

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        {filters.map(f => (
          <FilterTag
            key={f.id}
            filter={f}
            onUpdate={handleUpdateFilter}
            onRemove={handleRemoveFilter}
            columnOptions={[]}
            valueOptions={getValueOptions ? getValueOptions(f.column) : []}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {showSearchInput ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onBlur={() => {
                if (!searchTerm) {
                  setShowSearchInput(false)
                }
              }}
              className="h-8 border-0 bg-transparent placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0"
              autoFocus
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground"
            onClick={() => setShowSearchInput(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        <AddFilterDropdown
          availableColumns={availableColumns}
          onAddFilter={handleAddFilter}
          getValueOptions={getValueOptions}
        />
      </div>
    </div>
  )
}