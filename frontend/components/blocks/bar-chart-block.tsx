import { createReactBlockSpec } from "@blocknote/react";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type Filter,
	MetricQueryBuilder,
} from "@/components/metric-query-builder";
import type { Metric, Operation } from "@/components/metric-types";
import { useTimeWindow } from "@/components/time-window-context";
import {
	type ExclusionType,
	TimeWindowExclusionSelect,
} from "@/components/time-window-exclusion";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "../ui/separator";
import { type Aggregation, AggregationSettings } from "./ChartSettingsItem";

type BarChartDataPoint = {
	name: string;
	value: number;
};

export const createBarChartBlock = createReactBlockSpec(
	{
		type: "barChart",
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		propSchema: {
			// Display
			grid: { default: true },
			title: { default: "Bar Chart" },
			showTitle: { default: false },
			legend: { default: false },
			color: { default: "var(--color-chart-1)" },
			orientation: { default: "horizontal" },

			// Data - metric query
			selectedMetric: { default: "" }, // JSON string: Metric object
			filters: { default: "" }, // JSON string: Filter[]
			operation: { default: "" }, // Operation name (e.g., "average", "p95")

			// Aggregation
			aggregation: { default: "" },
			conditionTarget: { default: "value" }, // 'value' or label name
			conditionOp: { default: "eq" }, // eq, neq, lte, gte, between
			conditionValue: { default: "" },
			conditionValue2: { default: "" }, // for between

			// Grouping
			groupBy: { default: "" }, // JSON array: ["status", "endpoint"]

			// Time window
			exclude: { default: "none" },

			// Transient UI state - managed by local state, stripped from updates
			open: { default: false },
		},
		content: "none",
	},
	{
		render: ({ block, editor }) => {
			const grid = block.props.grid !== false;
			const title = block.props.title || "Bar Chart";
			const showTitle = block.props.showTitle !== false;
			const color = block.props.color || "var(--color-chart-1)";

			// Parse selectedMetric from JSON string
			const parseSelectedMetric = (): Metric | null => {
				try {
					const m = block.props.selectedMetric;
					if (m && typeof m === "string") {
						return JSON.parse(m) as Metric;
					}
				} catch {}
				return null;
			};

			// Parse filters from JSON string
			const parseFilters = () => {
				try {
					const f = block.props.filters;
					if (f && typeof f === "string") {
						return JSON.parse(f);
					}
				} catch {}
				return [];
			};

			// Parse operation from JSON string
			const parseOperation = (): Operation | null => {
				try {
					const op = block.props.operation;
					if (op && typeof op === "string") {
						return JSON.parse(op) as Operation;
					}
				} catch {}
				return null;
			};

			const selectedMetricValue = parseSelectedMetric();
			const filtersValue = parseFilters();
			const selectedOperationValue = parseOperation();

			const aggregation = block.props.aggregation as Aggregation | null;
			const conditionTarget = block.props.conditionTarget || "value";
			const conditionOp = block.props.conditionOp || "eq";
			const conditionValue = block.props.conditionValue || "";
			const conditionValue2 = block.props.conditionValue2 || "";

			const parseGroupBy = (): string[] => {
				try {
					const g = block.props.groupBy;
					if (g && typeof g === "string") {
						const arr = JSON.parse(g);
						if (Array.isArray(arr)) return arr as string[];
					}
				} catch {}
				return [];
			};

			const groupBy = parseGroupBy();
			const exclude = block.props.exclude || "none";

			// Access the time window from context
			const timeWindow = useTimeWindow();

			// State for chart data
			const [chartData, setChartData] = useState<BarChartDataPoint[]>([]);
			const [_, setIsLoading] = useState(false);

			// Mock API call - will be replaced with real API later
			const fetchChartData = useCallback(
				async (
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					metric: Metric,
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					filters: Filter[],
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					groupBy: string[],
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					timeWindow: { start: Date; end: Date },
				) => {
					setIsLoading(true);

					// Simulate API call
					await new Promise((resolve) => setTimeout(resolve, 300));

					// Generate mock data
					const categories = [
						"Category A",
						"Category B",
						"Category C",
						"Category D",
						"Category E",
					];
					const seed = Date.now() % 100000;
					const rand = (n: number) => {
						const a = 1664525;
						const c = 1013904223;
						const m = 2 ** 32;
						const val = (a * (seed + n) + c) % m;
						return val / m;
					};
					const mockData = categories.map((name, i) => ({
						name,
						value: Math.round(30 + 70 * rand(i)),
					}));

					setChartData(mockData);
					setIsLoading(false);
				},
				[],
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
				block.props.operation, // Use the JSON string directly
				block.props.groupBy, // Use the JSON string directly
				timeWindow,
				fetchChartData,
			]);

			// Use local state for UI-only state (doesn't need to be persisted)
			const [open, setOpen] = useState(false);

			// Sync block.props.open to local state when it changes (e.g., from settings menu)
			// This is a one-way sync: props -> state, never state -> props
			useEffect(() => {
				const propsOpen = Boolean(block.props.open);
				if (propsOpen) {
					setOpen(true);
				}
			}, [block.props]);

			// Memoize updateProps to prevent creating new function on every render
			const updateProps = useCallback(
				(
					next: Partial<{
						grid: boolean;
						title: string;
						showTitle: boolean;
						legend: boolean;
						color: string;
						orientation: string;
						selectedMetric: string;
						filters: string;
						operation: string;
						aggregation: string;
						conditionTarget: string;
						conditionOp: string;
						conditionValue: string;
						conditionValue2: string;
						groupBy: string;
						exclude: string;
					}>,
				) => {
					// Only send what changed - BlockNote merges partial updates
					Promise.resolve().then(() => {
						editor.updateBlock(block, { props: next });
					});
				},
				[editor, block],
			);

			const updateGroupBy = (labels: string[]) => {
				updateProps({ groupBy: JSON.stringify(labels) });
			};

			// Get available labels from the selected metric
			const availableLabels = selectedMetricValue?.labels || [];

			// Memoize callbacks to prevent infinite loops
			const handleMetricChange = useCallback(
				(metric: Metric | null) => {
					updateProps({ selectedMetric: metric ? JSON.stringify(metric) : "" });
				},
				[updateProps],
			);

			const handleFiltersChange = useCallback(
				(filters: Filter[]) => {
					updateProps({ filters: JSON.stringify(filters) });
				},
				[updateProps],
			);

			const handleOperationChange = useCallback(
				(operation: Operation | null) => {
					updateProps({
						operation: operation ? JSON.stringify(operation) : "",
					});
				},
				[updateProps],
			);

			return (
				<div className="w-full max-w-full relative">
					{showTitle && String(title || "").trim() !== "" && (
						<div className="text-sm font-medium mb-2">{title}</div>
					)}
					<ChartContainer
						config={{ value: { label: "Value", color } }}
						className="h-[220px] w-full"
					>
						<BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
							{grid && <CartesianGrid strokeDasharray="3 3" />}
							<XAxis type="number" dataKey="value" hide />
							<YAxis
								dataKey="name"
								type="category"
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								width={100}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="value" fill={color} radius={5} />
						</BarChart>
					</ChartContainer>

					{/* Settings Drawer */}
					<Sheet
						open={open}
						onOpenChange={(v) => {
							setOpen(v);
							Promise.resolve().then(() => {
								editor.updateBlock(block, { props: { open: v } });
							});
						}}
					>
						<SheetContent className="w-[360px] sm:max-w-none p-0 flex h-full flex-col">
							<div className="border-b p-6">
								<SheetHeader>
									<SheetTitle>Settings</SheetTitle>
								</SheetHeader>
							</div>
							<div className="flex-1 overflow-y-auto p-6 space-y-6">
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
									<div className="space-y-1">
										<label className="text-xs text-muted-foreground font-medium">
											Color
										</label>
										<Select
											value={color}
											onValueChange={(v) => updateProps({ color: v })}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="var(--color-chart-1)">
													<div className="flex items-center gap-2">
														<span
															className="inline-block h-0.5 w-6 rounded-full"
															style={{ background: "var(--color-chart-1)" }}
														/>
														<span>Red</span>
													</div>
												</SelectItem>
												<SelectItem value="var(--color-chart-2)">
													<div className="flex items-center gap-2">
														<span
															className="inline-block h-0.5 w-6 rounded-full"
															style={{ background: "var(--color-chart-2)" }}
														/>
														<span>Blue</span>
													</div>
												</SelectItem>
												<SelectItem value="var(--color-chart-3)">
													<div className="flex items-center gap-2">
														<span
															className="inline-block h-0.5 w-6 rounded-full"
															style={{ background: "var(--color-chart-3)" }}
														/>
														<span>Green</span>
													</div>
												</SelectItem>
												<SelectItem value="var(--color-chart-4)">
													<div className="flex items-center gap-2">
														<span
															className="inline-block h-0.5 w-6 rounded-full"
															style={{ background: "var(--color-chart-4)" }}
														/>
														<span>Yellow</span>
													</div>
												</SelectItem>
												<SelectItem value="var(--color-chart-5)">
													<div className="flex items-center gap-2">
														<span
															className="inline-block h-0.5 w-6 rounded-full"
															style={{ background: "var(--color-chart-5)" }}
														/>
														<span>Orange</span>
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
								<Separator className="my-4" />
								{/* Data Section */}
								<div className="space-y-3">
									<h3 className="text-sm font-medium text-muted-foreground">
										Data
									</h3>
									<MetricQueryBuilder
										selectedMetric={selectedMetricValue}
										onMetricChange={handleMetricChange}
										selectedOperation={selectedOperationValue}
										onOperationChange={handleOperationChange}
										filters={filtersValue}
										onFiltersChange={handleFiltersChange}
										enableOperationSelector={false}
									/>

									<AggregationSettings
										value={aggregation}
										onChange={(value) => updateProps({ aggregation: value })}
										conditionTarget={conditionTarget}
										onConditionTargetChange={(v) =>
											updateProps({ conditionTarget: v })
										}
										availableLabelTargets={availableLabels}
										conditionOp={conditionOp}
										onConditionOpChange={(v) => updateProps({ conditionOp: v })}
										conditionValue={conditionValue}
										onConditionValueChange={(v) =>
											updateProps({ conditionValue: v })
										}
										conditionValue2={conditionValue2}
										onConditionValue2Change={(v) =>
											updateProps({ conditionValue2: v })
										}
									/>
								</div>

								<Separator className="my-4" />

								{/* Group Section */}
								<div className="space-y-3">
									<h3 className="text-sm font-medium text-muted-foreground">
										Group
									</h3>
									<div className="space-y-1">
										<label className="text-xs text-muted-foreground font-medium">
											Split by
										</label>
										<MultiSelect
											options={availableLabels.map((label: string) => ({
												value: label,
												label,
											}))}
											value={groupBy}
											onChange={updateGroupBy}
											placeholder="Select labels to group by..."
											searchPlaceholder="Search labels..."
										/>
									</div>
								</div>

								<Separator className="my-4" />
								{/* Time Window Section */}
								<div className="space-y-3">
									<h3 className="text-sm font-medium text-muted-foreground">
										Time Window
									</h3>
									<div className="space-y-1">
										<label className="text-xs text-muted-foreground font-medium">
											Exclude
										</label>
										<TimeWindowExclusionSelect
											value={exclude as ExclusionType}
											onChange={(v) => updateProps({ exclude: v })}
										/>
									</div>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			);
		},
	},
);
