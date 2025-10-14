/**
 * Format a UTC date string to a relative time string (e.g., "2 minutes ago", "3 hours ago")
 * The date is converted from UTC to the user's local timezone before calculating the interval
 *
 * @param utcDateString - ISO 8601 date string in UTC (e.g., "2025-10-14T12:30:00Z")
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(utcDateString: string | null | undefined): string {
  if (!utcDateString) {
    return 'Unknown'
  }

  try {
    // Parse the UTC date string and convert to local time
    const date = new Date(utcDateString)
    const now = new Date()

    // Calculate the difference in milliseconds
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    // Return appropriate relative time string
    if (diffSeconds < 10) {
      return 'just now'
    } else if (diffSeconds < 60) {
      return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'} ago`
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    } else if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
    } else if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
    } else {
      return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
    }
  } catch (error) {
    console.error('Failed to format relative time:', error)
    return 'Unknown'
  }
}

/**
 * Format a UTC date string to a localized date/time string in the user's timezone
 *
 * @param utcDateString - ISO 8601 date string in UTC
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Localized date string
 */
export function formatLocalDateTime(
  utcDateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  if (!utcDateString) {
    return 'Unknown'
  }

  try {
    const date = new Date(utcDateString)
    return date.toLocaleString('en-US', options)
  } catch (error) {
    console.error('Failed to format local date time:', error)
    return 'Unknown'
  }
}

/**
 * Get a full timestamp with both relative and absolute time
 * Useful for tooltips or detailed views
 *
 * @param utcDateString - ISO 8601 date string in UTC
 * @returns Object with relative and absolute time strings
 */
export function formatFullTimestamp(utcDateString: string | null | undefined): {
  relative: string
  absolute: string
} {
  return {
    relative: formatRelativeTime(utcDateString),
    absolute: formatLocalDateTime(utcDateString)
  }
}

/**
 * Format duration in milliseconds to h:m:s format
 * Only shows non-zero components (e.g., "5s", "2m 30s", "1h 15m 23s", "250ms")
 * For durations under 1 second, displays milliseconds
 *
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1h 2m 3s", "45s", "2m 15s", "250ms")
 */
export function formatDuration(durationMs: number | null | undefined): string {
  if (durationMs === null || durationMs === undefined || durationMs < 0) {
    return '0ms'
  }

  // If duration is less than 1 second, show milliseconds
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`
  }

  const totalSeconds = Math.floor(durationMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours}h`)
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`)
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`)
  }

  return parts.join(' ')
}
