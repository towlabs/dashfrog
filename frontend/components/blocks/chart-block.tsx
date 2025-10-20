'use client'

import { createReactBlockSpec } from '@blocknote/react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { MetricQueryBuilder } from '@/components/metric-query-builder'
import type { Metric, Operation } from '@/components/metric-types'
import { MultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { useTimeWindow } from '@/components/time-window-context'
import { useCallback, useState, useEffect } from 'react'

type ChartDataPoint = {
  x: string
  y: number
}

export const createChartBlock = createReactBlockSpec(
  {
    type: 'chart',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    propSchema: {
      grid: { default: true },
      title: { default: 'Line Chart' },
      showTitle: { default: false },
      legend: { default: false },
      // JSON string: the selected metric object (e.g., {"name": "response_time", ...})
      selectedMetric: { default: '' },
      // JSON string: array of filter objects (e.g., [{"label": "status", "operator": "=", "value": "200"}])
      filters: { default: '' },
      // JSON string: the selected operation object for statistics
      operation: { default: '' },
      // JSON array of label names to group by: ["status", "endpoint"]
      groupBy: { default: '' },
      // whether the settings sheet is open
      open: { default: false },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      // Access the time window from context
      const timeWindow = useTimeWindow()

      const grid = (block.props as any).grid !== false
      const title = (block.props as any).title || 'Line Chart'
      const showTitle = (block.props as any).showTitle !== false
      const legend = (block.props as any).legend !== false

      // Parse selectedMetric from JSON string
      const parseSelectedMetric = () => {
        try {
          const m = (block.props as any).selectedMetric
          if (m && typeof m === 'string') {
            return JSON.parse(m)
          }
        } catch {}
        return null
      }

      // Parse filters from JSON string
      const parseFilters = () => {
        try {
          const f = (block.props as any).filters
          if (f && typeof f === 'string') {
            return JSON.parse(f)
          }
        } catch {}
        return []
      }

      // Parse operation from JSON string
      const parseOperation = (): Operation | null => {
        try {
          const op = (block.props as any).operation
          if (op && typeof op === 'string') {
            return JSON.parse(op) as Operation
          }
        } catch {}
        return null
      }

      const selectedMetricValue = parseSelectedMetric()
      const filtersValue = parseFilters()
      const selectedOperationValue = parseOperation()

      const parseGroupBy = (): string[] => {
        try {
          const g = (block.props as any).groupBy
          if (g && typeof g === 'string') {
            const arr = JSON.parse(g)
            if (Array.isArray(arr)) return arr as string[]
          }
        } catch {}
        return []
      }

      const groupBy = parseGroupBy()

      // State for chart data
      const [chartData, setChartData] = useState<ChartDataPoint[]>([])
      const [isLoading, setIsLoading] = useState(false)

      // Mock API call - will be replaced with real API later
      const fetchChartData = useCallback(async (
        metric: any,
        filters: any[],
        groupBy: string[],
        timeWindow: { start: Date; end: Date }
      ) => {
        setIsLoading(true)

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300))

        // Generate mock data based on time window
        const dataPoints = 12
        const seed = Date.now() % 100000
        const rand = (n: number) => {
          // simple LCG for deterministic-but-changing randomness
          const a = 1664525
          const c = 1013904223
          const m = 2 ** 32
          const val = (a * (seed + n) + c) % m
          return val / m
        }
        const mockData = Array.from({ length: dataPoints }, (_, i) => ({
          x: `M${i + 1}`,
          y: Math.round(40 + 40 * rand(i) + 8 * Math.sin(i / 2)),
        }))

        setChartData(mockData)
        setIsLoading(false)
      }, [])

      // Fetch data whenever dependencies change
      useEffect(() => {
        if (selectedMetricValue) {
          fetchChartData(selectedMetricValue, filtersValue, groupBy, timeWindow)
        }
      }, [
        (block.props as any).selectedMetric, // Use the JSON string directly
        (block.props as any).filters, // Use the JSON string directly
        (block.props as any).operation, // Use the JSON string directly
        (block.props as any).groupBy, // Use the JSON string directly
        timeWindow.start.getTime(),
        timeWindow.end.getTime(),
        fetchChartData
      ])

      // Get available labels from the selected metric
      const getAvailableLabels = (): string[] => {
        if (!selectedMetricValue) return []
        return selectedMetricValue.labels || []
      }

      // Memoize updateProps to prevent creating new function on every render
      const updateProps = useCallback((next: Partial<{ grid: boolean; title: string; showTitle: boolean; legend: boolean; selectedMetric: string; filters: string; operation: string; groupBy: string; }>) => {
        // Always exclude 'open' from being persisted to block props
        Promise.resolve().then(() => {
          editor.updateBlock(block, { props: next } as any)
        })
      }, [editor, block])

      const updateGroupBy = (labels: string[]) => {
        updateProps({ groupBy: JSON.stringify(labels) })
      }

      // Memoize callbacks to prevent infinite loops
      const handleMetricChange = useCallback((metric: any) => {
        updateProps({ selectedMetric: metric ? JSON.stringify(metric) : '' })
      }, [updateProps])

      const handleFiltersChange = useCallback((filters: any[]) => {
        updateProps({ filters: JSON.stringify(filters) })
      }, [updateProps])

      const handleOperationChange = useCallback((operation: Operation | null) => {
        updateProps({ operation: operation ? JSON.stringify(operation) : '' })
      }, [updateProps])

      return (
        <div className="w-full max-w-full relative">
          {showTitle && String(title || '').trim() !== '' && (
            <div className="text-sm font-medium mb-2">{title}</div>
          )}
          <ChartContainer config={{ value: { label: 'Value', color: 'var(--color-chart-1)' } }} className="h-[220px] w-full">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              {grid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="y"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>

          {legend && groupBy.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--color-chart-1)' }} />
                <span className="font-medium text-foreground">Group 1</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--color-chart-2)' }} />
                <span className="font-medium text-foreground">Group 2</span>
              </div>
            </div>
          )}

          {/* Settings Drawer */}
          <Sheet open={Boolean((block.props as any).open)}
          onOpenChange={(v) => {
            Promise.resolve().then(() => {
              editor.updateBlock(block, { props: { open: Boolean(v) } } as any)
            })
          }}>
            <SheetContent className="w-[360px] sm:max-w-none p-0 flex h-full flex-col">
              <div className="border-b p-6">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {/* Display Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Display</h3>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Title</label>
                    <Input value={title} onChange={(e) => updateProps({ title: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={showTitle} onCheckedChange={(v) => updateProps({ showTitle: Boolean(v) })} />
                    <label className="text-sm cursor-pointer">Show title</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={grid} onCheckedChange={(v) => updateProps({ grid: Boolean(v) })} />
                    <label className="text-sm cursor-pointer">Show grid</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={legend} onCheckedChange={(v) => updateProps({ legend: Boolean(v) })} />
                    <label className="text-sm cursor-pointer">Show legend</label>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Data Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Data</h3>
                  <MetricQueryBuilder
                    selectedMetric={selectedMetricValue}
                    onMetricChange={handleMetricChange}
                    selectedOperation={selectedOperationValue}
                    onOperationChange={handleOperationChange}
                    filters={filtersValue}
                    onFiltersChange={handleFiltersChange}
                  />
                </div>

                <Separator className="my-4" />

                {/* Group Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Group</h3>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Split by</label>
                    <MultiSelect
                      options={getAvailableLabels().map(label => ({ value: label, label }))}
                      value={groupBy}
                      onChange={updateGroupBy}
                      placeholder="Select labels to group by..."
                      searchPlaceholder="Search labels..."
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )
    },
  }
)
