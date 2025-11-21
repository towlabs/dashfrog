"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
	BarChart3,
	CaseUpper,
	Eye,
	EyeOff,
	Hash,
	Table as TableIcon,
	Tags,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { LabelBadge } from "@/components/LabelBadge";
import { MetricSelector } from "@/components/MetricSelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Metrics } from "@/src/services/api/metrics";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import type {
	AggregationFunction,
	Metric,
	MetricAggregation,
	MetricValue,
} from "@/src/types/metric";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { formatMetricValue } from "@/src/utils/metricFormatting";
import React from "react";

export const MetricTableBlock = createReactBlockSpec(
	{
		type: "metricTable" as const,
		propSchema: {
			metricName: {
				default: "",
			},

			spatialAggregation: {
				default: "" as MetricAggregation | "",
			},
			temporalAggregation: {
				default: "last" as AggregationFunction,
			},
			blockFilters: {
				default: "[]",
			},
			showMetricColumn: {
				default: true,
			},
			showLabelsColumn: {
				default: true,
			},
			showValueColumn: {
				default: true,
			},
		},
		content: "none",
	},
	{
		render: (props) => {
			const { tenant } = useParams<{ tenant: string }>();
			const tenantName = tenant ? decodeURIComponent(tenant) : "";
			const settingsOpenBlockId = useNotebooksStore(
				(state) => state.settingsOpenBlockId,
			);
			const closeBlockSettings = useNotebooksStore(
				(state) => state.closeBlockSettings,
			);
			const openBlockSettings = useNotebooksStore(
				(state) => state.openBlockSettings,
			);
			const labels = useLabelsStore((state) => state.labels);
			const metrics = useNotebooksStore((state) => state.metrics);
			const metricsLoading = useNotebooksStore((state) => state.metricsLoading);
			const timeWindow = useNotebooksStore(
				(state) => state.currentNotebook?.timeWindow,
			);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);

			const blockFilters: Filter[] = useMemo(() => {
				try {
					return JSON.parse(props.block.props.blockFilters as string);
				} catch {
					return [];
				}
			}, [props.block.props.blockFilters]);

			const filters = useMemo(
				() => [...(notebookFilters || []), ...blockFilters],
				[notebookFilters, blockFilters],
			);

			const [metricValues, setMetricValues] = useState<MetricValue[] | null>(
				null,
			);
			const [loading, setLoading] = useState(false);

			const metricName = props.block.props.metricName as string;
			const spatialAggregation = props.block.props.spatialAggregation as
				| MetricAggregation
				| "";
			const temporalAggregation = props.block.props
				.temporalAggregation as AggregationFunction;
			const showMetricColumn = props.block.props.showMetricColumn as boolean;
			const showLabelsColumn = props.block.props.showLabelsColumn as boolean;
			const showValueColumn = props.block.props.showValueColumn as boolean;

			const selectedMetric = React.useMemo(() => {
				return metrics.find(
					(m) =>
						m.prometheusName === metricName &&
						m.aggregation === spatialAggregation,
				);
			}, [metricName, spatialAggregation, metrics]);

			// Fetch metric values
			useEffect(() => {
				if (
					!tenantName ||
					!selectedMetric ||
					!timeWindow ||
					!temporalAggregation
				) {
					return;
				}

				const fetchMetricValues = async () => {
					setLoading(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);
						const values = await Metrics.getScalars(
							tenantName,
							selectedMetric.prometheusName,
							start,
							end,
							selectedMetric.aggregation,
							temporalAggregation,
							filters,
						);
						setMetricValues(values.scalars);
					} catch (error) {
						console.error("Error fetching metric values:", error);
						setMetricValues(null);
					} finally {
						setLoading(false);
					}
				};

				void fetchMetricValues();
			}, [
				tenantName,
				selectedMetric,
				timeWindow,
				temporalAggregation,
				filters,
			]);

			if (!tenantName) {
				return (
					<div className="p-4 border rounded-lg">
						<div className="text-sm text-muted-foreground">
							No tenant selected
						</div>
					</div>
				);
			}

			const isSettingsOpen = settingsOpenBlockId === props.block.id;

			const handleMetricSelect = (metric: Metric) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						metricName: metric.prometheusName,
						spatialAggregation: metric.aggregation,
					},
				});
			};

			const handleAggregationChange = (value: string) => {
				props.editor.updateBlock(props.block, {
					props: {
						temporalAggregation: value as AggregationFunction,
					},
				});
			};

			const handleFiltersChange = (newFilters: Filter[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						blockFilters: JSON.stringify(newFilters),
					},
				});
			};

			const handleColumnToggle = (
				column: "metric" | "labels" | "value",
				checked: boolean,
			) => {
				const propMap = {
					metric: "showMetricColumn",
					labels: "showLabelsColumn",
					value: "showValueColumn",
				};
				props.editor.updateBlock(props.block, {
					props: {
						[propMap[column]]: checked,
					},
				});
			};

			// Render content based on state
			const renderContent = () => {
				if (!metricName) {
					return (
						<EmptyState
							icon={TableIcon}
							title="No metric selected"
							description="Select a metric to display in table format."
							onClick={() => openBlockSettings(props.block.id)}
							className="cursor-pointer"
						/>
					);
				}

				if (loading) {
					return (
						<div className="space-y-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					);
				}

				if (!selectedMetric) {
					return (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>Metric not found</p>
						</div>
					);
				}

				if (!metricValues || metricValues.length === 0) {
					return (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>No data available</p>
						</div>
					);
				}

				return (
					<div className="space-y-4">
						<Table>
							<TableHeader>
								<TableRow>
									{showMetricColumn && (
										<TableHead>
											<div className="flex items-center gap-2">
												<CaseUpper strokeWidth={2.5} className="size-4" />{" "}
												Metric
											</div>
										</TableHead>
									)}
									{showLabelsColumn && (
										<TableHead>
											<div className="flex items-center gap-2">
												<Tags strokeWidth={2.5} className="size-4" /> Labels
											</div>
										</TableHead>
									)}
									{showValueColumn && (
										<TableHead>
											<div className="flex items-center gap-2">
												<Hash strokeWidth={2.5} className="size-4" /> Value
											</div>
										</TableHead>
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{metricValues.map((mv, idx) => {
									const { formattedValue, displayUnit } = formatMetricValue(
										mv.value,
										selectedMetric.unit ?? undefined,
										selectedMetric.aggregation,
									);
									return (
										<TableRow key={idx}>
											{showMetricColumn && (
												<TableCell className="font-medium">
													{selectedMetric.prettyName}
												</TableCell>
											)}
											{showLabelsColumn && (
												<TableCell>
													<div className="flex flex-wrap gap-1">
														{Object.entries(mv.labels).map(([key, value]) => (
															<LabelBadge
																key={`${key}-${value}`}
																labelKey={key}
																labelValue={value}
															/>
														))}
													</div>
												</TableCell>
											)}
											{showValueColumn && (
												<TableCell>
													{formattedValue}
													{displayUnit && ` ${displayUnit}`}
												</TableCell>
											)}
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				);
			};

			return (
				<>
					<div className="outline-none min-w-0 flex-1">{renderContent()}</div>

					<Sheet
						open={isSettingsOpen}
						onOpenChange={(open) => {
							if (!open) closeBlockSettings();
						}}
					>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Metric Table Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Metric
									</h3>
									<MetricSelector
										metrics={metrics}
										metricsLoading={metricsLoading}
										selectedMetricName={metricName}
										selectedSpatialAggregation={spatialAggregation}
										onMetricSelect={handleMetricSelect}
									/>
								</div>

								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Aggregation
									</h3>
									<TooltipProvider delayDuration={300}>
										<Select
											value={temporalAggregation}
											onValueChange={handleAggregationChange}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select aggregation..." />
											</SelectTrigger>
											<SelectContent>
												<Tooltip>
													<TooltipTrigger asChild>
														<SelectItem value="last">
															Last (Value at end of period)
														</SelectItem>
													</TooltipTrigger>
													<TooltipContent side="right">
														<p className="max-w-xs text-sm">
															Returns the most recent value in the time window.
															Best for gauges and current state metrics.
														</p>
													</TooltipContent>
												</Tooltip>
												<Tooltip>
													<TooltipTrigger asChild>
														<SelectItem value="sum">
															Sum (Sum across period)
														</SelectItem>
													</TooltipTrigger>
													<TooltipContent side="right">
														<p className="max-w-xs text-sm">
															Adds up all values in the time window. Best for
															counter metrics and total counts.
														</p>
													</TooltipContent>
												</Tooltip>
												<Tooltip>
													<TooltipTrigger asChild>
														<SelectItem value="avg">
															Average (Average across period)
														</SelectItem>
													</TooltipTrigger>
													<TooltipContent side="right">
														<p className="max-w-xs text-sm">
															Calculates the mean of all values in the time
															window. Best for smoothing out fluctuations.
														</p>
													</TooltipContent>
												</Tooltip>
											</SelectContent>
										</Select>
									</TooltipProvider>
								</div>

								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Columns
									</h3>
									<div className="space-y-1">
										<div
											className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
											onClick={() =>
												handleColumnToggle("metric", !showMetricColumn)
											}
										>
											<div className="flex items-center gap-2">
												<BarChart3 className="size-4" strokeWidth={2.5} />
												<span className="text-sm">Metric</span>
											</div>
											{showMetricColumn ? (
												<Eye className="size-4" strokeWidth={2.5} />
											) : (
												<EyeOff className="size-4" strokeWidth={2.5} />
											)}
										</div>
										<div
											className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
											onClick={() =>
												handleColumnToggle("labels", !showLabelsColumn)
											}
										>
											<div className="flex items-center gap-2">
												<Tags className="size-4" strokeWidth={2.5} />
												<span className="text-sm">Labels</span>
											</div>
											{showLabelsColumn ? (
												<Eye className="size-4" strokeWidth={2.5} />
											) : (
												<EyeOff className="size-4" strokeWidth={2.5} />
											)}
										</div>
										<div
											className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
											onClick={() =>
												handleColumnToggle("value", !showValueColumn)
											}
										>
											<div className="flex items-center gap-2">
												<Hash className="size-4" strokeWidth={2.5} />
												<span className="text-sm">Value</span>
											</div>
											{showValueColumn ? (
												<Eye className="size-4" strokeWidth={2.5} />
											) : (
												<EyeOff className="size-4" strokeWidth={2.5} />
											)}
										</div>
									</div>
								</div>

								<div className="space-y-3 mt-6">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Additional Filters
									</h3>
									<FilterBadgesEditor
										availableLabels={labels}
										filters={blockFilters}
										onFiltersChange={handleFiltersChange}
									/>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</>
			);
		},
	},
)();
