import { subMinutes, subHours, subDays, startOfWeek, endOfWeek } from 'date-fns'

export type RelativeTimeValue = '15m' | '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | 'w'

export type TimeWindowConfig =
  | { type: 'relative'; metadata: { value: RelativeTimeValue } }
  | { type: 'absolute'; metadata: { start: Date; end: Date } }

export interface NotebookData {
  id: string
  title: string
  description: string
  locked: boolean
  timeWindow: TimeWindowConfig
  blockNoteId: string
  createdAt: Date
  updatedAt: Date
}

export type NotebookCreateInput = Omit<NotebookData, 'id' | 'createdAt' | 'updatedAt'>

export type NotebookUpdateInput = Partial<Omit<NotebookData, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * Convert a TimeWindowConfig to actual start/end dates
 */
export function resolveTimeWindow(config: TimeWindowConfig): { start: Date; end: Date; label?: string } {
  if (config.type === 'absolute') {
    return {
      start: config.metadata.start,
      end: config.metadata.end,
    }
  }

  const now = new Date()
  const { value } = config.metadata

  switch (value) {
    case '15m':
      return { start: subMinutes(now, 15), end: now, label: 'Last 15 minutes' }
    case '1h':
      return { start: subHours(now, 1), end: now, label: 'Last hour' }
    case '6h':
      return { start: subHours(now, 6), end: now, label: 'Last 6 hours' }
    case '12h':
      return { start: subHours(now, 12), end: now, label: 'Last 12 hours' }
    case '24h':
      return { start: subHours(now, 24), end: now, label: 'Last 24 hours' }
    case '7d':
      return { start: subDays(now, 7), end: now, label: 'Last 7 days' }
    case '30d':
      return { start: subDays(now, 30), end: now, label: 'Last 30 days' }
    case 'w':
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }), label: 'This week' }
    default:
      return { start: subHours(now, 24), end: now, label: 'Last 24 hours' }
  }
}
