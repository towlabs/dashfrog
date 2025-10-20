"use client";

import { createReactBlockSpec } from "@blocknote/react";
import * as React from "react";
import { MetricQueryBuilder } from "@/components/metric-query-builder";
import type { Metric, Operation } from "@/components/metric-types";
import { useTimeWindow } from "@/components/time-window-context";
import {
	type ExclusionType,
	TimeWindowExclusionSelect,
} from "@/components/time-window-exclusion";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "../ui/separator";
import { AggregationSettings } from "./ChartSettingsItem";

export const createNumberBlock = createReactBlockSpec(
	{
		type: "number",
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		propSchema: {
			label: { default: "Metric" },
			selectedMetric: { default: "" }, // JSON string of Metric object
			filters: { default: "" }, // JSON string of Filter[]
			operation: { default: "" }, // JSON string of Operation object
			aggregation: { default: "average" },
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
				const propsOpen = Boolean((block.props as any).open);
				if (propsOpen) {
					setOpen(true);
				}
			}, [(block.props as any).open]);

			const label = (block.props as any).label || "Metric";
			const aggregation = (block.props as any).aggregation || "average";
			const conditionTarget = (block.props as any).conditionTarget || "";
			const conditionOp = (block.props as any).conditionOp || "";
			const conditionValue = (block.props as any).conditionValue || "";
			const conditionValue2 = (block.props as any).conditionValue2 || "";
			const exclude = (block.props as any).exclude || "none";

			// Parse selectedMetric from JSON string
			const parseSelectedMetric = () => {
				try {
					const m = (block.props as any).selectedMetric;
					if (m && typeof m === "string") {
						return JSON.parse(m);
					}
				} catch {}
				return null;
			};

			// Parse filters from JSON string
			const parseFilters = () => {
				try {
					const f = (block.props as any).filters;
					if (f && typeof f === "string") {
						return JSON.parse(f);
					}
				} catch {}
				return [];
			};

			// Parse operation from JSON string
			const parseOperation = (): Operation | null => {
				try {
					const op = (block.props as any).operation;
					if (op && typeof op === "string") {
						return JSON.parse(op) as Operation;
					}
				} catch {}
				return null;
			};

			const selectedMetricValue = parseSelectedMetric();
			const filtersValue = parseFilters();
			const selectedOperationValue = parseOperation();

			// Access the time window from context
			const timeWindow = useTimeWindow();

			// State for number value
			const [numberValue, setNumberValue] = React.useState<string>("-");
			const [isLoading, setIsLoading] = React.useState(false);

			// Mock API call - will be replaced with real API later
			const fetchNumberData = React.useCallback(
				async (
					metric: any,
					filters: any[],
					aggregation: string,
					timeWindow: { start: Date; end: Date },
				) => {
					setIsLoading(true);

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
				[],
			);

			// Fetch data whenever dependencies change
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
				(block.props as any).selectedMetric,
				(block.props as any).filters,
				(block.props as any).operation,
				aggregation,
				exclude,
				timeWindow.start.getTime(),
				timeWindow.end.getTime(),
				fetchNumberData,
			]);

			// Memoize updateProps to prevent creating new function on every render
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
						editor.updateBlock(block, { props: next } as any);
					});
				},
				[editor, block],
			);

			// Get available labels from the selected metric
			const getAvailableLabels = (): string[] => {
				if (!selectedMetricValue) return [];
				return selectedMetricValue.labels || [];
			};

			// Memoize callbacks to prevent infinite loops
			const handleMetricChange = React.useCallback(
				(metric: Metric | null) => {
					updateProps({ selectedMetric: metric ? JSON.stringify(metric) : "" });
				},
				[updateProps],
			);

			const handleFiltersChange = React.useCallback(
				(filters: any[]) => {
					updateProps({ filters: JSON.stringify(filters) });
				},
				[updateProps],
			);

			const handleOperationChange = React.useCallback(
				(operation: Operation | null) => {
					updateProps({
						operation: operation ? JSON.stringify(operation) : "",
					});
				},
				[updateProps],
			);

			return (
				<div className="w-full max-w-full relative">
					<div
						className="flex flex-col justify-center gap-1 px-6 py-4 rounded-md border text-left cursor-pointer hover:bg-accent/50 transition-colors"
						onClick={() => setOpen(true)}
					>
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
								editor.updateBlock(block, { props: { open: v } } as any);
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
									<MetricQueryBuilder
										selectedMetric={selectedMetricValue}
										onMetricChange={handleMetricChange}
										selectedOperation={selectedOperationValue}
										onOperationChange={handleOperationChange}
										filters={filtersValue}
										onFiltersChange={handleFiltersChange}
										enableOperationSelector={false}
									/>
								</div>

								<Separator className="my-4" />

								{/* Aggregation Section */}
								<AggregationSettings
									value={aggregation as any}
									onChange={(value) => updateProps({ aggregation: value })}
									conditionTarget={conditionTarget}
									onConditionTargetChange={(value) =>
										updateProps({ conditionTarget: value })
									}
									availableLabelTargets={getAvailableLabels()}
									conditionOp={conditionOp}
									onConditionOpChange={(value) =>
										updateProps({ conditionOp: value })
									}
									conditionValue={conditionValue}
									onConditionValueChange={(value) =>
										updateProps({ conditionValue: value })
									}
									conditionValue2={conditionValue2}
									onConditionValue2Change={(value) =>
										updateProps({ conditionValue2: value })
									}
								/>

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
