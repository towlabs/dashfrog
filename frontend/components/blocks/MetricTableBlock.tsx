import { createReactBlockSpec } from "@blocknote/react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { MetricQueryBuilder } from "@/components/MetricQueryBuilder";
import {
	type ExclusionType,
	TimeWindowExclusionSelect,
} from "@/components/TimeWindowExclusion";
import { MultiSelect } from "@/components/ui/multi-select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useTimeWindow } from "@/src/contexts/time-window";
import type { Filter } from "@/src/types/filter";
import type { Metric, MetricKind } from "@/src/types/metric";
import { type Aggregation, AggregationSettings } from "./ChartSettingsItem";

type MetricTableRow = {
	name: string;
	value: number;
	[key: string]: string | number;
};

export const createMetricTableBlock = createReactBlockSpec(
	{
		type: "metricTable",
		propSchema: {
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
			const exclude = block.props.exclude || "none";

			// Access the time window from context
			const timeWindow = useTimeWindow();

			// State for table data
			const [tableData, setTableData] = useState<MetricTableRow[]>([]);
			const [_, setIsLoading] = useState(false);

			// Mock API call - will be replaced with real API later
			const fetchTableData = useCallback(async () => {
				setIsLoading(true);

				// Simulate API call
				await new Promise((resolve) => setTimeout(resolve, 300));

				// Generate mock data
				const items = ["Item A", "Item B", "Item C", "Item D", "Item E"];
				const seed = Date.now() % 100000;
				const rand = (n: number) => {
					const a = 1664525;
					const c = 1013904223;
					const m = 2 ** 32;
					const val = (a * (seed + n) + c) % m;
					return val / m;
				};
				const mockData = items.map((name, i) => ({
					name,
					value: Math.round(30 + 70 * rand(i)),
				}));

				setTableData(mockData);
				setIsLoading(false);
			}, []);

			// Fetch data whenever dependencies change
			// biome-ignore lint/correctness/useExhaustiveDependencies: use only json strings
			useEffect(() => {
				if (selectedMetricValue) {
					fetchTableData();
				}
			}, [
				block.props.selectedMetric, // Use the JSON string directly
				block.props.filters, // Use the JSON string directly
				block.props.operation, // Use the JSON string directly
				block.props.groupBy, // Use the JSON string directly
				timeWindow,
				fetchTableData,
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
			}, [block.props.open]);

			// Memoize updateProps to prevent creating new function on every render
			// Use block.id instead of block to avoid recreating on every BlockNote render
			// biome-ignore lint/correctness/useExhaustiveDependencies: block is captured but we only want to recreate when block.id changes
			const updateProps = useCallback(
				(
					next: Partial<{
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
				[editor, block.id],
			);

			const updateGroupBy = (labels: string[]) => {
				updateProps({ groupBy: JSON.stringify(labels) });
			};

			// Get available labels from the selected metric
			const availableLabels = selectedMetricValue?.labels || [];

			// Memoize callbacks to prevent infinite loops
			const handleMetricChange = useCallback(
				(metric: Metric<MetricKind> | null) => {
					updateProps({
						selectedMetric: metric ? JSON.stringify(metric) : "",
						// Reset aggregation when metric changes since different kinds have different allowed aggregations
						aggregation: "",
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

			return (
				<div className="w-full max-w-full relative">
					<div>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="text-right">Value</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tableData.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={2}
											className="text-center text-muted-foreground"
										>
											No data
										</TableCell>
									</TableRow>
								) : (
									tableData.map((row, index) => (
										<TableRow key={`${row.name}-${index}`}>
											<TableCell>{row.name}</TableCell>
											<TableCell className="text-right">{row.value}</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
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
								<div className="space-y-3">
									<h3 className="text-sm font-medium text-muted-foreground">
										Data
									</h3>
									<MetricQueryBuilder
										selectedMetric={selectedMetricValue}
										onMetricChange={handleMetricChange}
										filters={filtersValue}
										onFiltersChange={handleFiltersChange}
									/>

									{selectedMetricValue && (
										<AggregationSettings
											value={aggregation}
											onChange={(value) => updateProps({ aggregation: value })}
											metric={selectedMetricValue}
										/>
									)}
								</div>

								{/* Group Section */}
								<div className="space-y-3">
									<label className="text-xs text-muted-foreground font-medium">
										Split by
									</label>
									<MultiSelect
										options={availableLabels.map((label) => ({
											value: label,
											label: label,
										}))}
										value={groupBy}
										onChange={updateGroupBy}
										placeholder="Select labels to group by..."
										searchPlaceholder="Search labels..."
									/>
								</div>

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
