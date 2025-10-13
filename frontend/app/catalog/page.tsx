'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Search, Download, RefreshCcw, Workflow, TrendingUp, Package, Clock, CheckCircle2, XCircle, PlayCircle, Calendar, ChevronDown, Plus, Edit3, Loader2 } from 'lucide-react'
import {FilterBar, op_to_request} from '@/components/filter-bar'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { Flows } from '@/src/services/api/flows'
import type { Flow } from '@/src/types/flow'
import type { Step } from '@/src/types/step'
import type { Filter } from '@/src/types/filter'
import { StepTimeline } from '@/components/step-timeline'

// Sample Metrics data
const sampleMetrics = [
  {
    id: 1,
    name: 'API Response Time',
    description: 'Average response time for API endpoints',
    unit: 'ms',
    type: 'Technical',
    source: 'API Gateway',
    frequency: 'Real-time',
    lastValue: '145',
    labels: { service: 'orders', environment: 'production' },
    thresholds: { warning: 200, critical: 500 },
    rules: [
      {
        id: 'rule-1',
        name: 'High Response Time Alert',
        description: 'Trigger when response time > 200ms for 5 minutes',
        condition: 'greater' as const,
        threshold: 200,
        duration: 5,
        action: 'email' as const,
        status: 'active' as const
      },
      {
        id: 'rule-2',
        name: 'Critical Threshold Breach',
        description: 'Immediate alert when response time > 500ms',
        condition: 'greater' as const,
        threshold: 500,
        duration: 0,
        action: 'slack' as const,
        status: 'active' as const
      },
      {
        id: 'rule-3',
        name: 'Performance Trend Alert',
        description: 'Alert when response time increases by 50% over 24h',
        condition: 'greater' as const,
        threshold: 300,
        duration: 60,
        action: 'webhook' as const,
        status: 'disabled' as const
      }
    ]
  },
  {
    id: 2,
    name: 'Daily Active Users',
    description: 'Number of unique users active in the last 24 hours',
    unit: 'users',
    type: 'Business',
    source: 'Analytics Service',
    frequency: 'Hourly',
    lastValue: '24,521',
    labels: { platform: 'web', region: 'us-east' },
    thresholds: { warning: 20000, critical: 15000 }
  },
  {
    id: 3,
    name: 'Order Completion Rate',
    description: 'Percentage of orders successfully completed',
    unit: '%',
    type: 'Business',
    source: 'Order Service',
    frequency: 'Daily',
    lastValue: '94.2',
    labels: { tenant: 'acme', region: 'us-east' },
    thresholds: { warning: 90, critical: 85 }
  },
  {
    id: 4,
    name: 'Database Connection Pool',
    description: 'Active connections in the database pool',
    unit: 'connections',
    type: 'Technical',
    source: 'PostgreSQL',
    frequency: 'Real-time',
    lastValue: '42/100',
    labels: { database: 'primary', environment: 'production' },
    thresholds: { warning: 70, critical: 85 }
  },
  {
    id: 5,
    name: 'Revenue',
    description: 'Total revenue generated',
    unit: 'USD',
    type: 'Business',
    source: 'Payment Service',
    frequency: 'Daily',
    lastValue: '$125,430',
    labels: { tenant: 'acme', currency: 'USD' },
  },
  {
    id: 6,
    name: 'CPU Utilization',
    description: 'Average CPU usage across all servers',
    unit: '%',
    type: 'Technical',
    source: 'Monitoring Service',
    frequency: 'Real-time',
    lastValue: '68.5',
    labels: { cluster: 'prod-east', instance_type: 'm5.large' },
    thresholds: { warning: 75, critical: 90 }
  },
  {
    id: 7,
    name: 'Customer Satisfaction Score',
    description: 'Average customer satisfaction rating',
    unit: 'score',
    type: 'Business',
    source: 'Survey Platform',
    frequency: 'Weekly',
    lastValue: '4.2/5.0',
    labels: { region: 'us-east', survey_type: 'post_purchase' },
    thresholds: { warning: 4.0, critical: 3.5 }
  },
  {
    id: 8,
    name: 'Memory Usage',
    description: 'Memory consumption across services',
    unit: 'GB',
    type: 'Technical',
    source: 'Monitoring Service',
    frequency: 'Real-time',
    lastValue: '12.3/16',
    labels: { service: 'api-gateway', cluster: 'prod-east' },
    thresholds: { warning: 14, critical: 15.5 }
  },
  {
    id: 9,
    name: 'Conversion Rate',
    description: 'Percentage of visitors who make a purchase',
    unit: '%',
    type: 'Business',
    source: 'Analytics Service',
    frequency: 'Daily',
    lastValue: '3.8',
    labels: { channel: 'web', campaign: 'holiday2024' },
    thresholds: { warning: 3.0, critical: 2.5 }
  },
  {
    id: 10,
    name: 'Error Rate',
    description: '5xx errors per minute',
    unit: 'errors/min',
    type: 'Technical',
    source: 'API Gateway',
    frequency: 'Real-time',
    lastValue: '0.12',
    labels: { service: 'orders', environment: 'production' },
    thresholds: { warning: 0.5, critical: 1.0 }
  },
]

interface Workflow {
  id: number
  name: string
  description: string
  lastRun: string
  status: 'success' | 'failed' | 'running'
  labels: Record<string, string>
  rules?: Rule[]
}

interface Rule {
  id: string
  name: string
  description: string
  condition: 'greater' | 'less'
  threshold: number
  duration: number
  action: 'email' | 'slack' | 'webhook'
  status: 'active' | 'disabled'
  // Workflow-specific properties
  ruleType?: 'event' | 'duration' | 'schedule'
  event?: 'start' | 'fail' | 'success'
  expectedTime?: string // For schedule rules like "09:00"
  maxDuration?: number // For duration rules in minutes
}

interface Metric {
  id: number
  name: string
  description: string
  unit: string
  type: string
  source: string
  frequency: string
  lastValue: string
  labels: Record<string, string>
  thresholds?: {
    warning?: number
    critical?: number
  }
  rules?: Rule[]
}

// Chart configuration
const chartConfig: ChartConfig = {
  runs: {
    label: "Total Runs",
    color: "#3b82f6",
  },
  SUCCESS: {
    label: "Successful",
    color: "#10b981",
  },
  FAILED: {
    label: "Failed",
    color: "#ef4444",
  },
}

// Metric chart configuration
const metricChartConfig: ChartConfig = {
  value: {
    label: "Value",
    color: "#3b82f6",
  },
}

// Generate sample run history data
const generateRunHistory = () => {
  const data = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      runs: Math.floor(Math.random() * 20) + 5,
      successful: Math.floor(Math.random() * 15) + 3,
      failed: Math.floor(Math.random() * 3),
    })
  }
  return data
}

// Generate run history data from real Flow data
const generateRunHistoryFromFlows = (flows: Flow[]) => {
  const data = []
  const now = new Date()
  
  // Group flows by hour over the last 24 hours
  for (let i = 23; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
    
    const flowsInHour = flows.filter(flow => {
      if (!flow.created_at) return false
      const flowTime = new Date(flow.created_at)
      return flowTime >= hourStart && flowTime < hourEnd
    })
    
    const successful = flowsInHour.filter(f => f.status === 'SUCCESS' || f.status === 'completed').length
    const failed = flowsInHour.filter(f => f.status === 'FAILED' || f.status === 'failed').length
    
    data.push({
      time: hourStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      runs: flowsInHour.length,
      successful,
      failed,
    })
  }
  
  return data
}

// Generate sample metric history data
const generateMetricHistory = (metricName: string, thresholds?: { warning?: number; critical?: number }) => {
  const data = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    let value
    let count

    // Generate different patterns based on metric type, considering thresholds
    if (metricName.includes('Response Time')) {
      // Values around 100-300ms to cross warning threshold of 200ms
      value = Math.floor(Math.random() * 200) + 100 + Math.sin(i / 4) * 50
      count = Math.floor(Math.random() * 500) + 200 + Math.sin(i / 3) * 100
    } else if (metricName.includes('CPU')) {
      // Values around 50-85% to approach warning threshold of 75%
      value = Math.random() * 35 + 50 + Math.sin(i / 3) * 15
      count = Math.floor(Math.random() * 50) + 20 + Math.sin(i / 4) * 10
    } else if (metricName.includes('Users')) {
      value = Math.floor(Math.random() * 8000) + 18000 + Math.sin(i / 6) * 3000
      count = Math.floor(Math.random() * 1000) + 500 + Math.sin(i / 5) * 200
    } else if (metricName.includes('Rate') || metricName.includes('Score')) {
      value = Math.random() * 20 + 80 + Math.sin(i / 3) * 10
      count = Math.floor(Math.random() * 100) + 50 + Math.sin(i / 4) * 20
    } else if (metricName.includes('Error Rate')) {
      // Values around 0.1-0.8 to approach warning threshold of 0.5
      value = Math.random() * 0.7 + 0.1 + Math.sin(i / 2) * 0.2
      count = Math.floor(Math.random() * 20) + 5 + Math.sin(i / 3) * 5
    } else {
      value = Math.floor(Math.random() * 100) + 50
      count = Math.floor(Math.random() * 200) + 100 + Math.sin(i / 4) * 50
    }

    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.max(0, value),
      count: Math.max(0, count)
    })
  }
  return data
}


// Helper function to render steps in a simple waterfall view
const renderSteps = (steps: any[], totalDuration: number) => {
  return steps.map(step => {
    const leftPercent = (step.startMs / totalDuration) * 100
    const widthPercent = step.durationMs > 0 ? (step.durationMs / totalDuration) * 100 : 0

    return (
      <div key={step.id} className="flex items-center h-8 hover:bg-muted/50">
        {/* Step name */}
        <div className="flex-shrink-0 w-48 px-3">
          <span className="text-xs font-medium">{step.name}</span>
        </div>

        {/* Timeline visualization */}
        <div className="flex-1 flex items-center h-full relative">
          {/* Background grid lines */}
          <div className="absolute inset-0 flex">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex-1 border-l border-muted/20"></div>
            ))}
          </div>

          {/* The step bar */}
          <div className="relative w-full h-full flex items-center">
            {widthPercent > 0 ? (
              <div
                className="absolute h-5"
                style={{
                  left: `${leftPercent}%`,
                  width: `${Math.max(widthPercent, 0.5)}%`,
                }}
              >
                <div
                  className={`h-full rounded-sm flex items-center px-1 text-white text-xs font-medium ${
                    step.status === 'failed' ? 'bg-red-500' :
                    step.status === 'success' ? 'bg-emerald-500' :
                    step.status === 'skipped' ? 'bg-gray-400' :
                    'bg-blue-500'
                  }`}
                >
                  {widthPercent > 5 && (
                    <span className="truncate">
                      {step.durationMs >= 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              step.status === 'skipped' && (
                <div
                  className="absolute h-5 flex items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  <span className="text-xs text-gray-500">Skipped</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Duration on the right */}
        <div className="flex-shrink-0 w-20 text-right pr-3">
          <span className="text-xs text-muted-foreground font-mono">
            {step.durationMs > 0
              ? (step.durationMs >= 1000 ? `${(step.durationMs / 1000).toFixed(2)}s` : `${step.durationMs}ms`)
              : '-'
            }
          </span>
        </div>
      </div>
    )
  })
}

type ActiveFilter = { id: string; column: string; operator: 'equals' | 'contains' | 'not_equals' | 'in' | 'not_in'; value: string }

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('workflows')
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const normalizeLabels = (arr: any[]) => arr.map((m) => ({ ...m, labels: Object.fromEntries(Object.entries(m.labels).filter(([_, v]) => typeof v === 'string')) }))
  const [metrics, setMetrics] = useState<Metric[]>(normalizeLabels(sampleMetrics) as Metric[])
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Flow | null>(null)
  const [runHistory, setRunHistory] = useState<any[]>([])
  const [recentRuns, setRecentRuns] = useState<any[]>([])
  const [expandedFlowTraceId, setExpandedFlowTraceId] = useState<string | null>(null)
  const [timeWindow, setTimeWindow] = useState('24h')
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isMetricSheetOpen, setIsMetricSheetOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [metricHistory, setMetricHistory] = useState<any[]>([])
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [isWorkflowRuleDialog, setIsWorkflowRuleDialog] = useState(false)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    condition: 'greater' as 'greater' | 'less',
    threshold: 0,
    duration: 5,
    action: 'email' as 'email' | 'slack' | 'webhook',
    ruleType: 'event' as 'event' | 'duration' | 'schedule',
    event: 'fail' as 'start' | 'fail' | 'success',
    expectedTime: '09:00',
    maxDuration: 30
  })

  const [metricChartTab, setMetricChartTab] = useState<'count' | 'value'>('value')
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const [flowSteps, setFlowSteps] = useState<Step[]>([])
  const [loadingSteps, setLoadingSteps] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false)
  const loadMoreTriggerRef = React.useRef<HTMLDivElement>(null)

  // Helper function to convert timeWindow to date range params
  const getDateRangeFromTimeWindow = (): { from_date?: string; to_date?: string } => {
    const now = new Date()
    let fromDate: Date | undefined
    let toDate: Date = now

    switch (timeWindow) {
      case '15m':
        fromDate = new Date(now.getTime() - 15 * 60 * 1000)
        break
      case '30m':
        fromDate = new Date(now.getTime() - 30 * 60 * 1000)
        break
      case '1h':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          fromDate = customDateRange.from
          toDate = customDateRange.to
        }
        break
    }

    const dateRange: { from_date?: string; to_date?: string } = {}
    if (fromDate) {
      dateRange.from_date = fromDate.toISOString()
    }
    dateRange.to_date = toDate.toISOString()

    return dateRange
  }

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        setLoading(true)
        setError(null)

        // Convert UI filters to API filters
        const apiFilters: Filter[] = []

        // Add search term as name filter if present
        if (searchTerm) {
          apiFilters.push({
            key: 'name',
            value: searchTerm,
            op: op_to_request['contains'],
            is_label: false
          })
        }

        // Add label filters from filter bar
        filters.forEach(f => {
          apiFilters.push({
            key: f.column,
            value: f.value,
            op: op_to_request[f.operator],
            is_label: true
          })
        })

        const response = await Flows.latest(apiFilters.length > 0 ? apiFilters : undefined)
        setFlows(response.data)
      } catch (err) {
        console.error('Failed to fetch flows:', err)
        setError('Failed to load flows')
      } finally {
        setLoading(false)
      }
    }

    fetchFlows()
  }, [searchTerm, filters])

  // Reload workflow history when time window changes
  useEffect(() => {
    const reloadWorkflowHistory = async () => {
      if (!selectedWorkflow) return

      try {
        setLoadingHistory(true)
        setCurrentPage(1) // Reset to first page when filters change

        // Convert flow labels to filters
        const filters: Filter[] = Object.entries(selectedWorkflow.labels).map(([key, value]) => ({
          key,
          value: String(value),
          op: '=',
          is_label: true
        }))

        // Get date range from time window
        const dateRange = getDateRangeFromTimeWindow()

        // Load workflow history using flow name, labels as filters, and date range as query params
        const historyResponse = await Flows.history(selectedWorkflow.name, filters, { page: 1, nb_items: 7 }, dateRange)
        setRecentRuns(historyResponse.data.items || [])
        setTotalPages(historyResponse.data.total_pages)
        setCurrentPage(historyResponse.data.page)
      } catch (err) {
        console.error('Failed to reload workflow history:', err)
        setRecentRuns([selectedWorkflow]) // Show at least the current flow
      } finally {
        setLoadingHistory(false)
      }
    }

    reloadWorkflowHistory()
  }, [timeWindow, customDateRange, selectedWorkflow])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && !loadingMoreHistory && currentPage < totalPages) {
          loadMoreHistory()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    const currentRef = loadMoreTriggerRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [currentPage, totalPages, loadingMoreHistory])

  const getTimeWindowLabel = () => {
    switch (timeWindow) {
      case '15m': return 'Last 15 Minutes'
      case '30m': return 'Last 30 Minutes'
      case '1h': return 'Last Hour'
      case '24h': return 'Last 24 Hours'
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          return `${customDateRange.from.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })} - ${customDateRange.to.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}`
        }
        return 'Custom Range'
      default: return 'Last 24 Hours'
    }
  }

  // Group metrics by name for rowspan
  const groupMetricsByName = (metrics: Metric[]) => {
    const grouped: { [key: string]: Metric[] } = {}
    metrics.forEach(metric => {
      if (!grouped[metric.name]) {
        grouped[metric.name] = []
      }
      grouped[metric.name].push(metric)
    })
    return grouped
  }

  // Filter helpers
  const applyFilters = <T extends { labels: Record<string, string>; name: string; description: string }>(items: T[]) => {
    let result = items
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(it => it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q))
    }
    if (filters.length > 0) {
      result = result.filter(it => {
        return filters.every(f => {
          const val = it.labels?.[f.column] || ''
          const target = f.value.toLowerCase()
          const cur = String(val).toLowerCase()
          if (f.operator === 'equals') return cur === target
          if (f.operator === 'contains') return cur.includes(target)
          if (f.operator === 'starts_with') return cur.startsWith(target)
          return true
        })
      })
    }
    return result
  }

  const filteredMetrics: Metric[] = applyFilters<Metric>(metrics)

  // Group filtered data
  const groupedMetrics = groupMetricsByName(filteredMetrics)

  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await Flows.latest()
      setFlows(response.data)
      setMetrics(normalizeLabels(sampleMetrics) as Metric[])
    } catch (err) {
      console.error('Failed to refresh flows:', err)
      setError('Failed to refresh flows')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    console.log('Exporting data...')
  }


  const handleWorkflowClick = async (flow: Flow) => {
    try {
      setSelectedWorkflow(flow)
      setIsSheetOpen(true)
      setExpandedFlowTraceId(null) // Reset expanded flow
      setLoadingHistory(true)
      setCurrentPage(1) // Reset to first page

      // Convert flow labels to filters
      const filters: Filter[] = Object.entries(flow.labels).map(([key, value]) => ({
        key,
        value: String(value),
        op: '=',
        is_label: true
      }))

      // Get date range from time window
      const dateRange = getDateRangeFromTimeWindow()

      // Load workflow history using flow name, labels as filters, and date range as query params
      const historyResponse = await Flows.history(flow.name, filters, { page: 1, nb_items: 20 }, dateRange)
      setRecentRuns(historyResponse.data.items || [])
      setTotalPages(historyResponse.data.total_pages)
      setCurrentPage(historyResponse.data.page)
    } catch (err) {
      console.error('Failed to load workflow history:', err)
      setRecentRuns([flow]) // Show at least the current flow
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadMoreHistory = async () => {
    if (!selectedWorkflow || loadingMoreHistory || currentPage >= totalPages) return

    try {
      setLoadingMoreHistory(true)

      // Convert flow labels to filters
      const filters: Filter[] = Object.entries(selectedWorkflow.labels).map(([key, value]) => ({
        key,
        value: String(value),
        op: '=',
        is_label: true
      }))

      // Get date range from time window
      const dateRange = getDateRangeFromTimeWindow()

      // Load next page
      const nextPage = currentPage + 1
      const historyResponse = await Flows.history(selectedWorkflow.name, filters, { page: nextPage, nb_items: 20 }, dateRange)

      // Append new items to existing ones
      setRecentRuns(prev => [...prev, ...historyResponse.data.items])
      setCurrentPage(historyResponse.data.page)
    } catch (err) {
      console.error('Failed to load more history:', err)
    } finally {
      setLoadingMoreHistory(false)
    }
  }

  const handleMetricClick = (metric: Metric) => {
    setSelectedMetric(metric)
    setMetricHistory(generateMetricHistory(metric.name, metric.thresholds))
    setIsMetricSheetOpen(true)
  }

  const handleFlowRowClick = async (flow: Flow) => {
    // Toggle expanded state
    if (expandedFlowTraceId === flow.trace_id) {
      setExpandedFlowTraceId(null)
      setFlowSteps([])
      return
    }

    setExpandedFlowTraceId(flow.trace_id)
    setLoadingSteps(true)

    try {
      const stepsResponse = await Flows.getSteps(flow.name, flow.trace_id)
      console.log('Steps loaded for', flow.trace_id, ':', stepsResponse.data)
      setFlowSteps(stepsResponse.data)
    } catch (err) {
      console.error('Failed to load flow steps:', err)
      setFlowSteps([])
    } finally {
      setLoadingSteps(false)
    }
  }

  const handleLabelClick = (e: React.MouseEvent, key: string, value: string) => {
    e.stopPropagation() // Prevent row click

    // Check if filter already exists
    const existingFilter = filters.find(f => f.column === key && f.value === value && f.operator === 'equals')
    if (existingFilter) {
      return // Filter already exists, don't add duplicate
    }

    // Add new equals filter
    const newFilter: ActiveFilter = {
      id: `${key}-${Date.now()}`,
      column: key,
      operator: 'equals',
      value: value
    }

    setFilters([...filters, newFilter])
  }

  const handleAddRule = () => {
    setEditingRule(null)
    setIsWorkflowRuleDialog(false)
    setRuleForm({
      name: '',
      condition: 'greater',
      threshold: 0,
      duration: 5,
      action: 'email',
      ruleType: 'event',
      event: 'fail',
      expectedTime: '09:00',
      maxDuration: 30
    })
    setIsRuleDialogOpen(true)
  }

  const handleAddWorkflowRule = () => {
    setEditingRule(null)
    setIsWorkflowRuleDialog(true)
    setRuleForm({
      name: '',
      condition: 'greater',
      threshold: 0,
      duration: 5,
      action: 'email',
      ruleType: 'event',
      event: 'fail',
      expectedTime: '09:00',
      maxDuration: 30
    })
    setIsRuleDialogOpen(true)
  }

  const handleEditRule = (rule: Rule, isWorkflow = false) => {
    setEditingRule(rule)
    setIsWorkflowRuleDialog(isWorkflow)
    setRuleForm({
      name: rule.name,
      condition: rule.condition,
      threshold: rule.threshold,
      duration: rule.duration,
      action: rule.action,
      ruleType: rule.ruleType || 'event',
      event: rule.event || 'fail',
      expectedTime: rule.expectedTime || '09:00',
      maxDuration: rule.maxDuration || 30
    })
    setIsRuleDialogOpen(true)
  }

  const handleSaveRule = () => {
    if (isWorkflowRuleDialog) {
      if (!selectedWorkflow) return

      let description = ''
      if (ruleForm.ruleType === 'event') {
        description = `Send ${ruleForm.action} when workflow ${ruleForm.event}s`
      } else if (ruleForm.ruleType === 'duration') {
        description = `Send ${ruleForm.action} when workflow runs longer than ${ruleForm.maxDuration} minutes`
      } else if (ruleForm.ruleType === 'schedule') {
        description = `Send ${ruleForm.action} if workflow hasn't completed by ${ruleForm.expectedTime} daily`
      }

      const newRule: Rule = {
        id: editingRule?.id || `rule-${Date.now()}`,
        name: ruleForm.name,
        description,
        condition: ruleForm.condition,
        threshold: ruleForm.threshold,
        duration: ruleForm.duration,
        action: ruleForm.action,
        status: 'active' as const,
        ruleType: ruleForm.ruleType,
        event: ruleForm.event,
        expectedTime: ruleForm.expectedTime,
        maxDuration: ruleForm.maxDuration
      }

      // Update the workflow with the new/edited rule
      const updatedWorkflows = workflows.map(workflow => {
        if (workflow.id === selectedWorkflow.id) {
          const updatedRules = editingRule
            ? (workflow.rules || []).map(r => r.id === editingRule.id ? newRule : r)
            : [...(workflow.rules || []), newRule]
          return { ...workflow, rules: updatedRules }
        }
        return workflow
      })

      setWorkflows(updatedWorkflows)
      setSelectedWorkflow({ ...selectedWorkflow, rules: editingRule
        ? (selectedWorkflow.rules || []).map(r => r.id === editingRule.id ? newRule : r)
        : [...(selectedWorkflow.rules || []), newRule]
      })
    } else {
      if (!selectedMetric) return

      const newRule: Rule = {
        id: editingRule?.id || `rule-${Date.now()}`,
        name: ruleForm.name,
        description: `${ruleForm.condition === 'greater' ? 'Alert when' : 'Alert when'} ${selectedMetric.name.toLowerCase()} ${ruleForm.condition === 'greater' ? '>' : '<'} ${ruleForm.threshold}${selectedMetric.unit !== 'users' && selectedMetric.unit !== 'USD' && selectedMetric.unit !== 'score' && selectedMetric.unit !== 'connections' ? selectedMetric.unit : ''} ${ruleForm.duration > 0 ? `for ${ruleForm.duration} minutes` : 'immediately'}`,
        condition: ruleForm.condition,
        threshold: ruleForm.threshold,
        duration: ruleForm.duration,
        action: ruleForm.action,
        status: 'active' as const
      }

      // Update the metric with the new/edited rule
      const updatedMetrics = metrics.map(metric => {
        if (metric.id === selectedMetric.id) {
          const updatedRules = editingRule
            ? (metric.rules || []).map(r => r.id === editingRule.id ? newRule : r)
            : [...(metric.rules || []), newRule]
          return { ...metric, rules: updatedRules }
        }
        return metric
      })

      setMetrics(updatedMetrics)
      setSelectedMetric({ ...selectedMetric, rules: editingRule
        ? (selectedMetric.rules || []).map(r => r.id === editingRule.id ? newRule : r)
        : [...(selectedMetric.rules || []), newRule]
      })
    }

    setIsRuleDialogOpen(false)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data Catalog</h2>
          <p className="text-gray-500">
            Browse and manage your workflows and metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Tabs moved to header */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="workflows" className="flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Workflows
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Metrics
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="default"
            onClick={handleRefresh}
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="ml-2 hidden lg:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              <span className="ml-2 hidden lg:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={`Search ${activeTab}...`}
        filters={filters}
        onFiltersChange={setFilters}
        availableColumns={([...new Set((activeTab === 'workflows' ? flows : (metrics as any)).flatMap((wf: any) => Object.keys(wf.labels))) ] as string[]).map((col) => ({ value: col, label: col }))}
        getValueOptions={(column) => {
          const items = activeTab === 'workflows' ? flows : (metrics as any)
          const values = [...new Set(items.map((w: any) => w.labels[column]).filter(Boolean) as string[])]
          // Return undefined instead of empty array to enable manual input
          return values.length > 0 ? values : undefined as any
        }}
      />

      {/* Tab Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Name</TableHead>
                  <TableHead className="w-[35%]">Description</TableHead>
                  <TableHead className="w-[25%]">Labels</TableHead>
                  <TableHead className="w-[15%]">Last Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading flows...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : flows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No flows found
                    </TableCell>
                  </TableRow>
                ) : (
                  flows.map((flow, index) => (
                    <TableRow
                      key={`flow-${flow.trace_id}-${index}`}
                      className="group hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleWorkflowClick(flow)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          {flow.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {flow.description || 'No description available'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(flow.labels).map(([key, value]) => (
                            <span
                              key={`${flow.trace_id}-label-${key}`}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={(e) => handleLabelClick(e, key, value)}
                            >
                              {key}: {value}
                            </span>
                          ))}
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                            service: {flow.service_name}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                            duration: {Math.round(flow.duration / 1000)}s
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            flow.status === 'completed' || flow.status === 'SUCCESS' ? 'bg-green-500' :
                            flow.status === 'failed' || flow.status === 'FAILED' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`}></div>
                          <div className="flex flex-col">
                            <span>{flow.created_at ? new Date(flow.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground capitalize">{flow.status}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Name</TableHead>
                  <TableHead className="w-[35%]">Description</TableHead>
                  <TableHead className="w-[25%]">Labels</TableHead>
                  <TableHead className="w-[15%]">Last Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMetrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No metrics found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMetrics.map((metric) => (
                    <TableRow
                      key={`metric-${metric.id}`}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleMetricClick(metric)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-500" />
                          {metric.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {metric.description}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(metric.labels).map(([key, value]) => (
                            <span
                              key={`${metric.id}-label-${key}`}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={(e) => handleLabelClick(e, key, value)}
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {metric.lastValue} {metric.unit !== 'users' && metric.unit !== 'USD' && metric.unit !== 'score' && metric.unit !== 'connections' && (
                          <span className="text-xs text-muted-foreground">{metric.unit}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Right Drawer with Workflow Details */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[1000px] sm:max-w-none overflow-auto">
          {selectedWorkflow && (
            <>
              {/* Header with title and action buttons - Fixed at top */}
              <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b flex-shrink-0">
                <SheetHeader className="p-0 flex-1">
                  <SheetTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {selectedWorkflow.name} - History
                  </SheetTitle>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {Object.entries(selectedWorkflow.labels).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={(e) => handleLabelClick(e, key, value)}
                      >
                        {key}: {value}
                      </span>
                    ))}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                      service: {selectedWorkflow.service_name}
                    </span>
                  </div>
                  <SheetDescription>
                    {selectedWorkflow.description || 'No description available'}
                  </SheetDescription>
                </SheetHeader>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        className="flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        {getTimeWindowLabel()}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setTimeWindow('15m')}>
                        Last 15 Minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('30m')}>
                        Last 30 Minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('1h')}>
                        Last Hour
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('24h')}>
                        Last 24 Hours
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('7d')}>
                        Last 7 Days
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('30d')}>
                        Last 30 Days
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          setTimeWindow('custom')
                          setShowDatePicker(true)
                        }}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Custom Range...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Runs Over Time Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Workflow Runs (Last 24 Hours)</h4>
                  <ChartContainer
                    config={chartConfig}
                    className="h-[200px] w-full"
                  >
                    <LineChart data={runHistory} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={30}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                      />
                      <Line
                        type="monotone"
                        dataKey="runs"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>


                {/* Recent Runs Table */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Runs</h4>
                  {loadingHistory ? (
                    <div className="border rounded-lg p-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading workflow history...</span>
                      </div>
                    </div>
                  ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table className="table-fixed">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[20%]">Status</TableHead>
                          <TableHead className="w-[30%]">Start Time</TableHead>
                          <TableHead className="w-[30%]">End Time</TableHead>
                          <TableHead className="w-[20%]">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentRuns.map((flow: Flow, index: number) => (
                          <React.Fragment key={`${flow.trace_id}-${index}`}>
                            <TableRow
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleFlowRowClick(flow)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {flow.status === 'SUCCESS' || flow.status === 'completed' ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : flow.status === 'FAILED' || flow.status === 'failed' ? (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  ) : (
                                    <PlayCircle className="h-3 w-3 text-blue-500" />
                                  )}
                                  <span className={`text-xs capitalize ${
                                    flow.status === 'SUCCESS' || flow.status === 'completed'
                                      ? 'text-green-600'
                                      : flow.status === 'FAILED' || flow.status === 'failed'
                                      ? 'text-red-600'
                                      : 'text-blue-600'
                                  }`}>
                                    {flow.status.toLowerCase()}
                                  </span>
                                  {expandedFlowTraceId === flow.trace_id && (
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                  )}
                                  {expandedFlowTraceId !== flow.trace_id && (
                                    <ChevronDown className="h-3 w-3 ml-1 -rotate-90" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                {flow.created_at ? new Date(flow.created_at).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Unknown'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {flow.ended_at ? new Date(flow.ended_at).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {Math.round(flow.duration / 1000)}s
                              </TableCell>
                            </TableRow>
                            {expandedFlowTraceId === flow.trace_id && (
                              <TableRow>
                                <TableCell colSpan={4} className="p-0">
                                  <div className="p-4 bg-muted/30 max-w-full">
                                    <h5 className="text-sm font-medium mb-3">Flow Steps</h5>
                                    {loadingSteps ? (
                                      <div className="p-8">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                          <span className="text-sm">Loading steps...</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto max-w-full">
                                        <StepTimeline
                                          steps={flowSteps}
                                          workflowCreatedAt={flow.created_at}
                                          workflowEndedAt={flow.ended_at}
                                          workflowLabels={flow.labels}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                          <TableRow
                              className="hover:bg-muted/50" >
                              <TableCell colspan={4} className="p-0">
                                  {currentPage >= totalPages && !loadingMoreHistory && (
                                      <div className="p-4 text-center border-t">
                                          No more history available
                                      </div>
                                  )}
                              </TableCell>
                          </TableRow>
                      </TableBody>
                    </Table>
                    {/* Infinite scroll trigger - invisible element that triggers load when scrolled into view */}
                    {currentPage < totalPages && (
                      <div
                        ref={loadMoreTriggerRef}
                        className="h-20 flex items-center justify-center"
                      >
                        {loadingMoreHistory && (
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading more...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {/* Rules section commented out - Flow objects don't have rules */}
                {/* 
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Notification Rules</h4>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={handleAddWorkflowRule}
                    >
                      <Plus className="h-3 w-3" />
                      Add Rule
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      Rules are not available for Flow objects.
                    </div>
                  </div>
                </div>
                */}

              </div>

              {/* Custom Date Range Picker */}
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Select Date Range</div>
                    <div className="flex gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">From</Label>
                        <CalendarComponent
                          mode="single"
                          selected={customDateRange.from}
                          onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                          className="rounded-md border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">To</Label>
                        <CalendarComponent
                          mode="single"
                          selected={customDateRange.to}
                          onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                          className="rounded-md border"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="default"
                        variant="outline"
                        onClick={() => {
                          setShowDatePicker(false)
                          setTimeWindow('24h')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="default"
                        onClick={() => {
                          setShowDatePicker(false)
                          if (customDateRange.from && customDateRange.to) {
                            setTimeWindow('custom')
                          }
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
                </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Metric Details Drawer */}
      <Sheet open={isMetricSheetOpen} onOpenChange={setIsMetricSheetOpen}>
        <SheetContent className="w-[1000px] sm:max-w-none overflow-auto">
          {selectedMetric && (
            <>
              {/* Header with title and action buttons - Fixed at top */}
              <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b flex-shrink-0">
                <SheetHeader className="p-0 flex-1">
                  <SheetTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {selectedMetric.name}
                  </SheetTitle>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {Object.entries(selectedMetric.labels).map(([key, value]) => (
                      <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                  <SheetDescription>
                    {selectedMetric.description}
                  </SheetDescription>
                </SheetHeader>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        className="flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        {getTimeWindowLabel()}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setTimeWindow('15m')}>
                        Last 15 Minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('30m')}>
                        Last 30 Minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('1h')}>
                        Last Hour
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('24h')}>
                        Last 24 Hours
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('7d')}>
                        Last 7 Days
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeWindow('30d')}>
                        Last 30 Days
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          setTimeWindow('custom')
                          setShowDatePicker(true)
                        }}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Custom Range...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Metric Chart with Tabs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Metric Over Time (Last 24 Hours)</h4>
                    <Tabs value={metricChartTab} onValueChange={(value) => setMetricChartTab(value as 'count' | 'value')} className="">
                      <TabsList className="h-7">
                        <TabsTrigger value="value" className="text-xs h-6">Value</TabsTrigger>
                        <TabsTrigger value="count" className="text-xs h-6">Count</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <ChartContainer
                    config={metricChartConfig}
                    className="h-[200px] w-full"
                  >
                    <LineChart data={metricHistory} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={60}
                        domain={['dataMin - 10', 'dataMax + 10']}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                      />
                      {/* Warning threshold line - only show for value tab */}
                      {metricChartTab === 'value' && selectedMetric.thresholds?.warning && (
                        <ReferenceLine
                          y={selectedMetric.thresholds.warning}
                          stroke="rgb(234 179 8)"
                          strokeDasharray="8 4"
                          strokeWidth={2}
                        />
                      )}
                      {/* Critical threshold line - only show for value tab */}
                      {metricChartTab === 'value' && selectedMetric.thresholds?.critical && (
                        <ReferenceLine
                          y={selectedMetric.thresholds.critical}
                          stroke="rgb(239 68 68)"
                          strokeDasharray="8 4"
                          strokeWidth={2}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey={metricChartTab}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>

                {/* Rules */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Notification Rules</h4>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={handleAddRule}
                    >
                      <Plus className="h-3 w-3" />
                      Add Rule
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {selectedMetric?.rules?.map((rule) => (
                      <div
                        key={rule.id}
                        onClick={() => handleEditRule(rule)}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              rule.status === 'active'
                                ? rule.action === 'email' ? 'bg-green-500' : rule.action === 'slack' ? 'bg-blue-500' : 'bg-orange-500'
                                : 'bg-gray-400'
                            }`}></div>
                            <span className="text-sm font-medium">{rule.name}</span>
                            <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{rule.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rule.description}
                        </p>
                      </div>
                    )) || (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        No rules configured. Click "Add Rule" to create one.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Date Range Picker */}
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Select Date Range</div>
                    <div className="flex gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">From</Label>
                        <CalendarComponent
                          mode="single"
                          selected={customDateRange.from}
                          onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                          className="rounded-md border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">To</Label>
                        <CalendarComponent
                          mode="single"
                          selected={customDateRange.to}
                          onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                          className="rounded-md border"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="default"
                        variant="outline"
                        onClick={() => {
                          setShowDatePicker(false)
                          setTimeWindow('24h')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="default"
                        onClick={() => {
                          setShowDatePicker(false)
                          if (customDateRange.from && customDateRange.to) {
                            setTimeWindow('custom')
                          }
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
                </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Rule Edit Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Rule'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="Enter rule name"
              />
            </div>
            {isWorkflowRuleDialog ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="ruleType">Rule Type</Label>
                  <Select value={ruleForm.ruleType} onValueChange={(value: 'event' | 'duration' | 'schedule') => setRuleForm({ ...ruleForm, ruleType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event-based</SelectItem>
                      <SelectItem value="duration">Duration-based</SelectItem>
                      <SelectItem value="schedule">Schedule-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ruleForm.ruleType === 'event' && (
                  <div className="grid gap-2">
                    <Label htmlFor="event">Workflow Event</Label>
                    <Select value={ruleForm.event} onValueChange={(value: 'start' | 'fail' | 'success') => setRuleForm({ ...ruleForm, event: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="start">Workflow Start</SelectItem>
                        <SelectItem value="fail">Workflow Failure</SelectItem>
                        <SelectItem value="success">Workflow Success</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {ruleForm.ruleType === 'duration' && (
                  <div className="grid gap-2">
                    <Label htmlFor="maxDuration">Maximum Duration (minutes)</Label>
                    <Input
                      id="maxDuration"
                      type="number"
                      value={ruleForm.maxDuration}
                      onChange={(e) => setRuleForm({ ...ruleForm, maxDuration: Number(e.target.value) })}
                      placeholder="Alert if running longer than..."
                    />
                  </div>
                )}

                {ruleForm.ruleType === 'schedule' && (
                  <div className="grid gap-2">
                    <Label htmlFor="expectedTime">Expected Completion Time</Label>
                    <Input
                      id="expectedTime"
                      type="time"
                      value={ruleForm.expectedTime}
                      onChange={(e) => setRuleForm({ ...ruleForm, expectedTime: e.target.value })}
                      placeholder="HH:MM"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert if workflow hasn't completed by this time daily
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={ruleForm.condition} onValueChange={(value: 'greater' | 'less') => setRuleForm({ ...ruleForm, condition: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greater">Greater than</SelectItem>
                      <SelectItem value="less">Less than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="threshold">Threshold</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="threshold"
                      type="number"
                      value={ruleForm.threshold}
                      onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })}
                      placeholder="Enter threshold value"
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedMetric?.unit}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={ruleForm.duration}
                    onChange={(e) => setRuleForm({ ...ruleForm, duration: Number(e.target.value) })}
                    placeholder="Duration before alert (0 = immediate)"
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="action">Action</Label>
              <Select value={ruleForm.action} onValueChange={(value: 'email' | 'slack' | 'webhook') => setRuleForm({ ...ruleForm, action: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Send Email</SelectItem>
                  <SelectItem value="slack">Send Slack Message</SelectItem>
                  <SelectItem value="webhook">Call Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={!ruleForm.name || (!isWorkflowRuleDialog && ruleForm.threshold === 0)}>
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}