import { createReactBlockSpec } from "@blocknote/react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { MetricConfiguration } from "@/components/MetricConfiguration";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useTimeWindow } from "@/src/contexts/time-window";
import { generatePromQuery } from "@/src/services/promql-builder";
import type { Filter } from "@/src/types/filter";
import type { Aggregation, Metric, MetricKind } from "@/src/types/metric";

type ChartDataPoint = {
	x: string;
	y: number;
};

export const createChartBlock = createReactBlockSpec(
	{
		type: "chart",
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		propSchema: {
			grid: { default: true },
			title: { default: "Line Chart" },
			showTitle: { default: false },
			legend: { default: false },
			// JSON string: the selected metric object (e.g., {"name": "response_time", ...})
			selectedMetric: { default: "" },
			// JSON string: array of filter objects (e.g., [{"label": "status", "operator": "=", "value": "200"}])
			filters: { default: "" },
			// Aggregation type (e.g., "sum", "avg", "p95")
			aggregation: { default: "" },
			// JSON array of label names to group by: ["status", "endpoint"]
			groupBy: { default: "" },
			// whether the settings sheet is open
			open: { default: false },
		},
		content: "none",
	},
	{
		render: ({ block, editor }) => {
			// Access the time window from context
			const timeWindow = useTimeWindow();

			const grid = block.props.grid !== false;
			const title = block.props.title || "Line Chart";
			const showTitle = block.props.showTitle !== false;
			const legend = block.props.legend !== false;

			// Memoize parsed values to prevent unnecessary re-parsing
			const selectedMetricValue = React.useMemo(() => {
				try {
					const m = block.props.selectedMetric;
					if (m && typeof m === "string") {
						return JSON.parse(m) as Metric<MetricKind>;
					}
				} catch {}
				return null;
			}, [block.props.selectedMetric]);

			const filtersValue = React.useMemo(() => {
				try {
					const f = block.props.filters;
					if (f && typeof f === "string") {
						return JSON.parse(f) as Filter[];
					}
				} catch {}
				return [];
			}, [block.props.filters]);

			const aggregation = (block.props.aggregation as Aggregation) || "";

			const groupBy = React.useMemo(() => {
				try {
					const g = block.props.groupBy;
					if (g && typeof g === "string") {
						const arr = JSON.parse(g);
						if (Array.isArray(arr)) return arr as string[];
					}
				} catch {}
				return [];
			}, [block.props.groupBy]);
			// biome-ignore lint/correctness/useExhaustiveDependencies: use only json strings
			const promQuery = React.useMemo(() => {
				if (!selectedMetricValue || !aggregation) return null;
				return generatePromQuery(
					selectedMetricValue,
					filtersValue,
					timeWindow.start,
					timeWindow.end,
					aggregation,
					false,
					groupBy.length > 0 ? groupBy : selectedMetricValue.labels,
				);
			}, [
				block.props.groupBy,
				block.props.aggregation,
				block.props.filters,
				block.props.selectedMetric,
				timeWindow.start,
				timeWindow.end,
			]);

			// State for chart data
			const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
			const [_, setIsLoading] = useState(false);

			// Mock API call - will be replaced with real API later
			const fetchChartData = useCallback(
				async (
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					metric: Metric<MetricKind>,
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					filters: Filter[],
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					groupBy: string[],
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					timeWindow: { start: Date; end: Date },
				) => {
					console.log("fetchChartData", promQuery);
					setIsLoading(true);

					// Simulate API call
					await new Promise((resolve) => setTimeout(resolve, 300));

					// Generate mock data based on time window
					const dataPoints = 12;
					const seed = Date.now() % 100000;
					const rand = (n: number) => {
						// simple LCG for deterministic-but-changing randomness
						const a = 1664525;
						const c = 1013904223;
						const m = 2 ** 32;
						const val = (a * (seed + n) + c) % m;
						return val / m;
					};
					const mockData = Array.from({ length: dataPoints }, (_, i) => ({
						x: `M${i + 1}`,
						y: Math.round(40 + 40 * rand(i) + 8 * Math.sin(i / 2)),
					}));

					setChartData(mockData);
					setIsLoading(false);
				},
				[promQuery],
			);

			// Fetch data whenever dependencies change
			// biome-ignore lint/correctness/useExhaustiveDependencies: use only json strings
			useEffect(() => {
				if (selectedMetricValue) {
					fetchChartData(
						selectedMetricValue,
						filtersValue,
						groupBy,
						timeWindow,
					);
				}
			}, [
				block.props.selectedMetric, // Use the JSON string directly
				block.props.filters, // Use the JSON string directly
				block.props.groupBy, // Use the JSON string directly
				timeWindow.start.getTime(),
				timeWindow.end.getTime(),
				fetchChartData,
			]);

			// Memoize updateProps to prevent creating new function on every render
			// Use block.id instead of block to avoid recreating on every BlockNote render
			// biome-ignore lint/correctness/useExhaustiveDependencies: block is captured but we only want to recreate when block.id changes
			const updateProps = useCallback(
				(
					next: Partial<{
						grid: boolean;
						title: string;
						showTitle: boolean;
						legend: boolean;
						selectedMetric: string;
						filters: string;
						aggregation: string;
						groupBy: string;
					}>,
				) => {
					// Always exclude 'open' from being persisted to block props
					Promise.resolve().then(() => {
						editor.updateBlock(block, { props: next });
					});
				},
				[editor, block.id],
			);

			// Memoize callbacks to prevent infinite loops
			const handleMetricChange = useCallback(
				(metric: Metric<MetricKind> | null) => {
					updateProps({
						selectedMetric: metric ? JSON.stringify(metric) : "",
						// Reset aggregation when metric changes since different kinds have different allowed aggregations
						aggregation: "",
						groupBy: "",
						filters: "",
					});
				},
				[updateProps],
			);

			const handleFiltersChange = useCallback(
				(filters: Filter[]) => {
					updateProps({ filters: JSON.stringify(filters) });
				},
				[updateProps],
			);

			const handleAggregationChange = useCallback(
				(agg: Aggregation) => {
					updateProps({ aggregation: agg });
				},
				[updateProps],
			);

			const handleGroupByChange = useCallback(
				(labels: string[]) => {
					updateProps({ groupBy: JSON.stringify(labels) });
				},
				[updateProps],
			);

			return (
				<div className="w-full max-w-full relative">
					{showTitle && String(title || "").trim() !== "" && (
						<div className="text-sm font-medium mb-2">{title}</div>
					)}
					<ChartContainer
						config={{
							value: { label: "Value", color: "var(--color-chart-1)" },
						}}
						className="h-[220px] w-full"
					>
						<LineChart
							data={chartData}
							margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
						>
							{grid && <CartesianGrid strokeDasharray="3 3" />}
							<XAxis
								dataKey="x"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								width={30}
							/>
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
								<span
									className="inline-block h-2.5 w-2.5 rounded-full"
									style={{ backgroundColor: "var(--color-chart-1)" }}
								/>
								<span className="font-medium text-foreground">Group 1</span>
							</div>
							<div className="flex items-center gap-1">
								<span
									className="inline-block h-2.5 w-2.5 rounded-full"
									style={{ backgroundColor: "var(--color-chart-2)" }}
								/>
								<span className="font-medium text-foreground">Group 2</span>
							</div>
						</div>
					)}

					{/* Settings Drawer */}
					<Sheet
						open={Boolean(block.props.open)}
						onOpenChange={(v) => {
							Promise.resolve().then(() => {
								editor.updateBlock(block, {
									props: { open: Boolean(v) },
								});
							});
						}}
					>
						<SheetContent className="w-[360px] sm:max-w-none p-0 flex h-full flex-col">
							<div className="border-b p-6">
								<SheetHeader>
									<SheetTitle>Settings</SheetTitle>
								</SheetHeader>
							</div>
							<div className="flex-1 overflow-y-auto p-6 space-y-3">
								{/* Display Section */}
								<div className="space-y-3">
									<h3 className="text-sm font-medium text-muted-foreground">
										Display
									</h3>
									<div className="space-y-1">
										<label className="text-xs text-muted-foreground font-medium">
											Title
										</label>
										<Input
											value={title}
											onChange={(e) => updateProps({ title: e.target.value })}
										/>
									</div>
									<div className="flex items-center gap-2">
										<Checkbox
											checked={showTitle}
											onCheckedChange={(v) =>
												updateProps({ showTitle: Boolean(v) })
											}
										/>
										<label className="text-sm cursor-pointer">Show title</label>
									</div>
									<div className="flex items-center gap-2">
										<Checkbox
											checked={grid}
											onCheckedChange={(v) => updateProps({ grid: Boolean(v) })}
										/>
										<label className="text-sm cursor-pointer">Show grid</label>
									</div>
									<div className="flex items-center gap-2">
										<Checkbox
											checked={legend}
											onCheckedChange={(v) =>
												updateProps({ legend: Boolean(v) })
											}
										/>
										<label className="text-sm cursor-pointer">
											Show legend
										</label>
									</div>
								</div>

								<Separator className="my-4" />

								{/* Data Section */}
								<div className="space-y-3">
									<h3 className="text-sm font-medium text-muted-foreground">
										Data
									</h3>
									<MetricConfiguration
										selectedMetric={selectedMetricValue}
										onMetricChange={handleMetricChange}
										filters={filtersValue}
										onFiltersChange={handleFiltersChange}
										aggregation={aggregation}
										onAggregationChange={handleAggregationChange}
										groupBy={groupBy}
										onGroupByChange={handleGroupByChange}
										showGroupBy={true}
										showAggregationWhen="distribution-or-grouped"
									/>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			);
		},
	},
);
