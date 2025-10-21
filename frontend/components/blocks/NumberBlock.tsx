import { createReactBlockSpec } from "@blocknote/react";
import * as React from "react";
import { MetricConfiguration } from "@/components/MetricConfiguration";
import {
	type ExclusionType,
	TimeWindowExclusionSelect,
} from "@/components/TimeWindowExclusion";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useTimeWindow } from "@/src/contexts/time-window";
import { generatePromQuery } from "@/src/services/promql-builder";
import type { Filter } from "@/src/types/filter";
import type {
	Aggregation,
	AggregationForKind,
	Metric,
	MetricKind,
} from "@/src/types/metric";

export const createNumberBlock = createReactBlockSpec(
	{
		type: "number",
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		propSchema: {
			label: { default: "Metric" },
			selectedMetric: { default: "" }, // JSON string of Metric object
			filters: { default: "" }, // JSON string of Filter[]
			operation: { default: "" }, // JSON string of Operation object
			aggregation: { default: "" },
			conditionTarget: { default: "" },
			conditionOp: { default: "" },
			conditionValue: { default: "" },
			conditionValue2: { default: "" },
			exclude: { default: "none" },
			open: { default: false },
		},
		content: "none",
	},
	{
		render: ({ block, editor }) => {
			// Use local state for UI-only state
			const [open, setOpen] = React.useState(false);

			// Sync block.props.open to local state when it changes
			React.useEffect(() => {
				const propsOpen = Boolean(block.props.open);
				if (propsOpen) {
					setOpen(true);
				}
			}, [block.props.open]);

			const label = block.props.label || "Metric";
			const aggregation = (block.props.aggregation as Aggregation) || "";
			const exclude = block.props.exclude || "none";

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

			// Access the time window from context
			const timeWindow = useTimeWindow();

			// State for number value
			const [numberValue, setNumberValue] = React.useState<string>("-");
			const [_, setIsLoading] = React.useState(false);

			// biome-ignore lint/correctness/useExhaustiveDependencies: use only json strings
			const promQuery = React.useMemo(() => {
				if (!selectedMetricValue || !aggregation) return null;
				return generatePromQuery(
					selectedMetricValue,
					filtersValue,
					timeWindow.start,
					timeWindow.end,
					aggregation,
					true,
					[],
				);
			}, [
				block.props.aggregation,
				block.props.filters,
				block.props.selectedMetric,
				timeWindow.start,
				timeWindow.end,
			]);

			// Mock API call - will be replaced with real API later
			const fetchNumberData = React.useCallback(
				async (
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					metric: Metric<MetricKind>,
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					filters: Filter[],
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					aggregation: AggregationForKind<MetricKind>,
					// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
					timeWindow: { start: Date; end: Date },
				) => {
					setIsLoading(true);
					console.log("fetchChartData", promQuery);

					// Simulate API call
					await new Promise((resolve) => setTimeout(resolve, 300));

					// Generate mock number value
					const seed = Date.now() % 100000;
					const rand = () => {
						const a = 1664525;
						const c = 1013904223;
						const m = 2 ** 32;
						const val = (a * seed + c) % m;
						return val / m;
					};
					const mockValue = Math.round(1000 + 5000 * rand());

					setNumberValue(mockValue.toString());
					setIsLoading(false);
				},
				[promQuery],
			);

			// Fetch data whenever dependencies change
			// biome-ignore lint/correctness/useExhaustiveDependencies: use only json strings
			React.useEffect(() => {
				if (selectedMetricValue) {
					fetchNumberData(
						selectedMetricValue,
						filtersValue,
						aggregation,
						timeWindow,
					);
				}
			}, [
				block.props.selectedMetric, // Use the JSON string directly
				block.props.filters, // Use the JSON string directly
				block.props.operation, // Use the JSON string directly
				timeWindow.start.getTime(),
				timeWindow.end.getTime(),
				fetchNumberData,
			]);

			// Memoize updateProps to prevent creating new function on every render
			// Use block.id instead of block to avoid recreating on every BlockNote render
			// biome-ignore lint/correctness/useExhaustiveDependencies: block is captured but we only want to recreate when block.id changes
			const updateProps = React.useCallback(
				(
					next: Partial<{
						label: string;
						selectedMetric: string;
						filters: string;
						operation: string;
						aggregation: string;
						conditionTarget: string;
						conditionOp: string;
						conditionValue: string;
						conditionValue2: string;
						exclude: string;
					}>,
				) => {
					Promise.resolve().then(() => {
						editor.updateBlock(block, { props: next });
					});
				},
				[editor, block.id],
			);

			// Memoize callbacks to prevent infinite loops
			const handleMetricChange = React.useCallback(
				(metric: Metric<MetricKind> | null) => {
					updateProps({
						selectedMetric: metric ? JSON.stringify(metric) : "",
						// Reset aggregation when metric changes since different kinds have different allowed aggregations
						aggregation: "",
						filters: "",
					});
				},
				[updateProps],
			);

			const handleFiltersChange = React.useCallback(
				(filters: Filter[]) => {
					updateProps({ filters: JSON.stringify(filters) });
				},
				[updateProps],
			);

			const handleAggregationChange = React.useCallback(
				(agg: Aggregation) => {
					updateProps({ aggregation: agg });
				},
				[updateProps],
			);

			return (
				<div className="w-full max-w-full relative">
					<div className="flex flex-col justify-center gap-1 px-6 py-4 rounded-md border text-left hover:bg-accent/50 transition-colors">
						<span className="text-muted-foreground text-xs">{label}</span>
						<span className="text-lg leading-none font-bold sm:text-3xl">
							{parseFloat(numberValue).toLocaleString()}
						</span>
					</div>

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
							<div className="flex-1 overflow-y-auto p-6 space-y-3">
								{/* Data Section */}
								<h3 className="text-sm font-medium text-muted-foreground">
									Data
								</h3>
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground font-medium">
										Label
									</label>
									<Input
										value={label}
										onChange={(e) => updateProps({ label: e.target.value })}
										placeholder="e.g. Total Requests"
									/>
								</div>
								<MetricConfiguration
									selectedMetric={selectedMetricValue}
									onMetricChange={handleMetricChange}
									filters={filtersValue}
									onFiltersChange={handleFiltersChange}
									aggregation={aggregation}
									onAggregationChange={handleAggregationChange}
									groupBy={[]}
									onGroupByChange={() => {}}
									showGroupBy={false}
									showAggregationWhen="distribution"
								/>

								{/* Time Window Section */}
								<div className="space-y-3">
									<label className="text-xs text-muted-foreground font-medium">
										Exclusions
									</label>
									<TimeWindowExclusionSelect
										value={exclude as ExclusionType}
										onChange={(v) => updateProps({ exclude: v })}
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
