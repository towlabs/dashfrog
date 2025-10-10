'use client'

import { createReactBlockSpec } from '@blocknote/react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { MoreHorizontal } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const demoData = Array.from({ length: 12 }, (_, i) => ({
  x: `M${i + 1}`,
  y: Math.round(50 + 30 * Math.sin(i / 2)),
}))

export const createChartBlock = createReactBlockSpec(
  {
    type: 'chart',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    propSchema: {
      grid: { default: true },
      title: { default: 'Chart' },
      legend: { default: true },
      // JSON string containing an array of time series: [{ id, name, metric, color }]
      series: { default: '' },
      open: { default: false },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const grid = (block.props as any).grid !== false
      const title = (block.props as any).title || 'Chart'
      const open = Boolean((block.props as any).open)
      const legend = (block.props as any).legend !== false

      type Series = { id: string; name: string; metric: string; color: string }
      const parseSeries = (): Series[] => {
        try {
          const s = (block.props as any).series
          if (s && typeof s === 'string') {
            const arr = JSON.parse(s)
            if (Array.isArray(arr)) return arr as Series[]
          }
        } catch {}
        return []
      }

      const series = parseSeries()
      const effectiveSeries: Series[] = series.length > 0
        ? series
        : [{ id: 's-1', name: 'Series 1', metric: 'value', color: 'var(--color-chart-1)' }]

      const updateProps = (next: Partial<{ grid: boolean; title: string; legend: boolean }>) => {
        editor.updateBlock(block, { props: { ...(block.props as any), ...next } } as any)
      }
      const updateSeries = (next: Series[]) => {
        editor.updateBlock(block, { props: { ...(block.props as any), series: JSON.stringify(next) } } as any)
      }

      return (
        <div className="w-full max-w-full relative">
          {String(title || '').trim() !== '' && (
            <div className="text-sm font-medium mb-2">{title}</div>
          )}
          <ChartContainer config={{ value: { label: 'Value', color: 'var(--color-chart-1)' } }} className="h-[220px] w-full">
            <LineChart data={demoData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              {grid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {effectiveSeries.map((s, idx) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey="y"
                  stroke={s.color || 'var(--color-chart-1)'}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray={idx % 2 === 1 ? '6 4' : undefined}
                />
              ))}
            </LineChart>
          </ChartContainer>

          {legend && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {effectiveSeries.map((s) => (
                <div key={`legend-${s.id}`} className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color || color }} />
                  <span className="font-medium text-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Settings Drawer */}
          <Sheet open={open} onOpenChange={(v) => editor.updateBlock(block, { props: { ...(block.props as any), open: Boolean(v) } } as any)}>
            <SheetContent className="w-[360px] sm:max-w-none p-0 flex h-full flex-col">
              <div className="border-b p-6">
                <SheetHeader>
                  <SheetTitle>Chart Settings</SheetTitle>
                </SheetHeader>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Title</div>
                  <Input value={title} onChange={(e) => updateProps({ title: e.target.value })} />
                </div>
                {/* no chart-level color; colors are per series */}
                <div className="flex items-center gap-2">
                  <Checkbox checked={grid} onCheckedChange={(v) => updateProps({ grid: Boolean(v) })} />
                  <span className="text-sm">Show grid</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={legend} onCheckedChange={(v) => updateProps({ legend: Boolean(v) })} />
                  <span className="text-sm">Show legend</span>
                </div>

                {/* Time Series Editor */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Time series</div>
                  <div className="space-y-3">
                    {effectiveSeries.map((s, idx) => (
                      <div key={s.id} className="rounded-md border p-3 space-y-2">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Name</div>
                          <Input
                            value={s.name}
                            onChange={(e) => {
                              const next = [...effectiveSeries]
                              next[idx] = { ...s, name: e.target.value }
                              updateSeries(next)
                            }}
                            placeholder="Series name"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Metric</div>
                          <Input
                            value={s.metric}
                            onChange={(e) => {
                              const next = [...effectiveSeries]
                              next[idx] = { ...s, metric: e.target.value }
                              updateSeries(next)
                            }}
                            placeholder="e.g. response_time_ms"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Color</div>
                          <Select
                            value={s.color}
                            onValueChange={(v) => {
                              const next = [...effectiveSeries]
                              next[idx] = { ...s, color: v }
                              updateSeries(next)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="var(--color-chart-1)">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: 'var(--color-chart-1)' }} />
                                  <span>Red</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="var(--color-chart-2)">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: 'var(--color-chart-2)' }} />
                                  <span>Blue</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="var(--color-chart-3)">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: 'var(--color-chart-3)' }} />
                                  <span>Green</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="var(--color-chart-4)">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: 'var(--color-chart-4)' }} />
                                  <span>Yellow</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="var(--color-chart-5)">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: 'var(--color-chart-5)' }} />
                                  <span>Orange</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const next = effectiveSeries.filter((x) => x.id !== s.id)
                              updateSeries(next)
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const id = `s-${Date.now()}`
                        const colorVar = `var(--color-chart-${(effectiveSeries.length % 5) + 1})`
                        const next = [...effectiveSeries, { id, name: `Series ${effectiveSeries.length + 1}`, metric: 'value', color: colorVar }]
                        updateSeries(next)
                      }}
                    >
                      Add series
                    </Button>
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
