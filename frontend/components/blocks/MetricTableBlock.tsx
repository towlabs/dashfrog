import { createReactBlockSpec } from "@blocknote/react";
import { useCallback, useEffect, useState } from "react";
import {
	type Filter,
	MetricQueryBuilder,
} from "@/components/MetricQueryBuilder";
import type { Metric, Operation } from "@/components/MetricTypes";
import { useTimeWindow } from "@/components/TimeWindowContext";
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
			}, [block.props]);

			// Memoize updateProps to prevent creating new function on every render
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

								{/* Group Section */}
								<div className="space-y-3">
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
