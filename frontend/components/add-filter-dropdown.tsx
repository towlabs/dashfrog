'use client'

import { useState } from 'react'
import { ListFilter, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type FilterOperator = 'equals' | 'contains' | 'starts_with' | 'not_equals' | 'less_than' | 'greater_than' | 'in' | 'not_in'

interface AddFilterDropdownProps {
  onAddFilter: (column: string, operator: FilterOperator, value: string) => void
  availableColumns: { value: string; label: string }[]
  getValueOptions?: (column: string) => string[] | undefined
}

export function AddFilterDropdown({ onAddFilter, availableColumns, getValueOptions }: AddFilterDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [operator, setOperator] = useState<FilterOperator>('equals')
  const [value, setValue] = useState('')
  const [operatorOpen, setOperatorOpen] = useState(false)
  const [valueOpen, setValueOpen] = useState(false)

  const operatorOptions = [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'less_than', label: 'less than' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'in', label: 'in' },
    { value: 'not_in', label: 'not in' }
  ]

  // Operators that should always use free text input
  const freeTextOperators: FilterOperator[] = ['contains', 'starts_with', 'less_than', 'greater_than']

  const handleColumnSelect = (column: string) => {
    setSelectedColumn(column)
    setValue('')
    setOperator('equals')
    setDropdownOpen(false)
    setDialogOpen(true)
  }

  const handleAddFilter = () => {
    if (selectedColumn && value) {
      onAddFilter(selectedColumn, operator, value)
      setDialogOpen(false)
      setSelectedColumn('')
      setValue('')
      setOperator('equals')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedColumn && value) {
      handleAddFilter()
    }
  }

  const valueOptions = selectedColumn && getValueOptions ? getValueOptions(selectedColumn) : undefined

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
              onClick={() => handleColumnSelect(column.value)}
              className="text-sm"
            >
              {column.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Filter: {selectedColumn}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Operator</label>
              <Popover open={operatorOpen} onOpenChange={setOperatorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={operatorOpen}
                    className="w-full justify-between h-9"
                  >
                    {operatorOptions.find((option) => option.value === operator)?.label}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {operatorOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setOperator(currentValue as FilterOperator)
                              setOperatorOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                operator === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Value</label>
              {/* Use free text input if operator requires it OR no value options available */}
              {freeTextOperators.includes(operator) || !valueOptions || valueOptions.length === 0 ? (
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter value..."
                  className="h-9"
                  autoFocus
                />
              ) : (
                <Popover open={valueOpen} onOpenChange={setValueOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={valueOpen}
                      className="w-full justify-between h-9"
                    >
                      {value || "Select value"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search values..." />
                      <CommandList>
                        <CommandEmpty>No value found.</CommandEmpty>
                        <CommandGroup>
                          {valueOptions.map((val) => (
                            <CommandItem
                              key={val}
                              value={val}
                              onSelect={(currentValue) => {
                                setValue(currentValue)
                                setValueOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  value === val ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {val}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFilter} disabled={!value}>
              Add Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}