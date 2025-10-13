'use client'

import { useState } from 'react'
import { X, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Filter {
  id: string
  column: string
  operator: 'equals' | 'contains' | 'starts_with' | 'not_equals' | 'less_than' | 'greater_than' | 'in' | 'not_in'
  value: string
}

interface FilterTagProps {
  filter: Filter
  onUpdate: (filter: Filter) => void
  onRemove: (id: string) => void
  columnOptions?: { value: string; label: string }[]
  valueOptions?: string[]
}

export function FilterTag({ filter, onUpdate, onRemove, columnOptions = [], valueOptions = [] }: FilterTagProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempOperator, setTempOperator] = useState(filter.operator)
  const [tempValue, setTempValue] = useState(filter.value)
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

  const operatorLabels: Record<Filter['operator'], string> = {
    equals: 'is',
    not_equals: 'is not',
    contains: 'contains',
    starts_with: 'starts with',
    less_than: 'less than',
    greater_than: 'greater than',
    in: 'in',
    not_in: 'not in'
  }

  // Operators that should always use free text input
  const freeTextOperators: Filter['operator'][] = ['contains', 'starts_with', 'less_than', 'greater_than']

  const handleSave = () => {
    onUpdate({
      ...filter,
      operator: tempOperator,
      value: tempValue
    })
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setTempOperator(filter.operator)
      setTempValue(filter.value)
      setIsOpen(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-0.5 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 hover:bg-transparent font-normal text-inherit text-xs"
          >
            <span className="text-muted-foreground">{filter.column}</span>
            <span className="mx-1 text-foreground">{operatorLabels[filter.operator]}</span>
            <span className="font-medium text-foreground">{filter.value}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-80 p-4"
          align="start"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            const target = e.target as Element
            if (target.closest('[data-radix-select-content]')) {
              e.preventDefault()
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Operator
              </label>
              <Popover open={operatorOpen} onOpenChange={setOperatorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={operatorOpen}
                    className="w-full justify-between h-9"
                  >
                    {operatorOptions.find((option) => option.value === tempOperator)?.label}
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
                              setTempOperator(currentValue as Filter['operator'])
                              setOperatorOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                tempOperator === option.value ? "opacity-100" : "opacity-0"
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

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Value
              </label>
              {/* Use free text input if operator requires it OR no value options available */}
              {freeTextOperators.includes(tempOperator) || !valueOptions || valueOptions.length === 0 ? (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
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
                      {tempValue || "Select value"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search values..." />
                      <CommandList>
                        <CommandEmpty>No value found.</CommandEmpty>
                        <CommandGroup>
                          {valueOptions.map((value) => (
                            <CommandItem
                              key={value}
                              value={value}
                              onSelect={(currentValue) => {
                                setTempValue(currentValue)
                                setValueOpen(false)
                                handleSave()
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  tempValue === value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {value}
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
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(filter.id)}
        className="ml-0.5 h-3 w-3 p-0 hover:bg-muted/50 rounded-full"
      >
        <X className="h-2 w-2" />
      </Button>
    </div>
  )
}