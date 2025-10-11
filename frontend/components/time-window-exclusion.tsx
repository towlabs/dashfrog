'use client'

import React from 'react'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'

export type ExclusionType = 'none' | 'incidents' | 'maintenance' | 'both'

interface TimeWindowExclusionProps {
  value: ExclusionType
  onChange: (exclusion: ExclusionType) => void
}

export function TimeWindowExclusionSelect({ value, onChange }: TimeWindowExclusionProps) {
  const options: MultiSelectOption[] = [
    { value: 'incidents', label: 'Incidents' },
    { value: 'maintenance', label: 'Maintenance' },
  ]

  const selectedValues: string[] = React.useMemo(() => {
    if (value === 'both') return ['incidents', 'maintenance']
    if (value === 'incidents') return ['incidents']
    if (value === 'maintenance') return ['maintenance']
    return []
  }, [value])

  const handleChange = (next: string[]) => {
    if (next.length === 0) {
      onChange('none')
      return
    }
    const hasIncidents = next.includes('incidents')
    const hasMaintenance = next.includes('maintenance')
    if (hasIncidents && hasMaintenance) {
      onChange('both')
    } else if (hasIncidents) {
      onChange('incidents')
    } else {
      onChange('maintenance')
    }
  }

  return (
    <MultiSelect
      options={options}
      value={selectedValues}
      onChange={handleChange}
      placeholder="Exclude..."
      searchPlaceholder="Filter exclusions..."
    />
  )
}
