"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
	ChartLine,
	ChevronDown,
	Divide,
	FlipHorizontal,
	Gauge,
	ListFilterPlus,
	RectangleHorizontal,
	SquareDot,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { LabelBadge } from "@/components/LabelBadge";
import { MetricDetailDrawer } from "@/components/MetricDetailDrawer";
import { InstantMetricSelector } from "@/components/MetricSelector";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
	Transform,
	InstantMetric,
	TimeAggregation,
	GroupByFn,
} from "@/src/types/metric";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { formatMetricValue } from "@/src/utils/metricFormatting";
import React from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const MetricBlock = createReactBlockSpec(
	{
		type: "metric" as const,
		propSchema: {
			metricName: {
				default: "",
			},
			title: {
				default: "",
			},
			transform: {
				default: "" as Transform | "",
			},
			timeAggregation: {
				default: "last" as TimeAggregation,
			},
			groupBy: {
				default: "[]",
			},
			groupByFn: {
				default: "sum" as GroupByFn,
			},
			matchOperator: {
				default: "==" as "==" | ">" | "<" | ">=" | "<=" | "!=",
			},
			matchValue: {
				default: "",
			},
			healthMin: {
				default: "",
			},
			healthMax: {
				default: "",
			},
			blockFilters: {
				default: "[]",
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
			const instantMetrics = useNotebooksStore((state) => state.instantMetrics);
			const rangeMetrics = useNotebooksStore((state) => state.rangeMetrics);
			const metricsLoading = useNotebooksStore((state) => state.metricsLoading);

			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const labels = useLabelsStore((state) => state.labels);
			const startDate = useNotebooksStore((state) => state.startDate);
			const endDate = useNotebooksStore((state) => state.endDate);
			const [scalarData, setScalarData] = useState<
				| {
						labels: Record<string, string>;
						value: number;
				  }[]
				| null
			>(null);
			const [loading, setLoading] = useState(false);
			const [detailOpen, setDetailOpen] = useState(false);
			const [selectedLabels, setSelectedLabels] = useState<
				Record<string, string>
			>({});

			const metricName = props.block.props.metricName as string;
			const title = props.block.props.title as string;
			const transform = props.block.props.transform as Transform | "";
			const timeAggregation = props.block.props
				.timeAggregation as TimeAggregation;
			const groupByFn = props.block.props.groupByFn as GroupByFn;
			const healthMin = props.block.props.healthMin as string;
			const healthMax = props.block.props.healthMax as string;
			const matchOperator = props.block.props.matchOperator as
				| "=="
				| ">"
				| "<"
				| ">="
				| "<="
				| "!=";
			const matchValue = props.block.props.matchValue as string;
			// Parse groupBy labels from JSON string
			const groupBy: string[] = useMemo(() => {
				try {
					return JSON.parse(props.block.props.groupBy as string);
				} catch {
					return [];
				}
			}, [props.block.props.groupBy]);
			// Parse block filters from JSON string
			const blockFilters: Filter[] = useMemo(() => {
				try {
					return JSON.parse(props.block.props.blockFilters as string);
				} catch {
					return [];
				}
			}, [props.block.props.blockFilters]);

			// Merge notebook filters with block filters
			const filters = useMemo(
				() => [...(notebookFilters || []), ...blockFilters],
				[notebookFilters, blockFilters],
			);

			const selectedMetric = React.useMemo(() => {
				return instantMetrics.find(
					(m) =>
						m.prometheusName === metricName &&
						m.transform === (transform || null),
				);
			}, [metricName, transform, instantMetrics]);

			const rangeMetric = React.useMemo(() => {
				if (!selectedMetric) return null;
				return rangeMetrics.find(
					(m) =>
						m.transform === selectedMetric.transform &&
						m.prometheusName === selectedMetric.prometheusName,
				);
			}, [selectedMetric, rangeMetrics]);

			// Fetch scalar data when metric and aggregation are selected
			useEffect(() => {
				if (
					!tenantName ||
					!selectedMetric ||
					startDate === null ||
					endDate === null ||
					filters === undefined
				) {
					setScalarData(null);
					return;
				}

				const fetchScalar = async () => {
					if (timeAggregation === "match" && !matchValue) {
						setScalarData([]);
						return;
					}

					setLoading(true);
					try {
						const response = await Metrics.getScalar(
							tenantName,
							selectedMetric.prometheusName,
							startDate,
							endDate,
							selectedMetric.transform,
							groupBy,
							groupByFn,
							timeAggregation,
							matchOperator,
							matchValue,
							filters,
						);
						setScalarData(response.scalars);
					} catch (error) {
						console.error("Failed to fetch metric scalar:", error);
						setScalarData(null);
					} finally {
						setLoading(false);
					}
				};

				void fetchScalar();
			}, [
				tenantName,
				selectedMetric,
				timeAggregation,
				groupBy,
				groupByFn,
				matchOperator,
				matchValue,
				startDate,
				endDate,
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

			const handleMetricSelect = (metric: InstantMetric) => {
				props.editor.updateBlock(props.block, {
					props: {
						metricName: metric.prometheusName,
						transform: metric.transform || "",
					},
				});
			};

			const handleTimeAggregationChange = (timeAgg: TimeAggregation) => {
				props.editor.updateBlock(props.block, {
					props: {
						timeAggregation: timeAgg,
					},
				});
			};

			const handleGroupByFnChange = (grpByFn: GroupByFn) => {
				props.editor.updateBlock(props.block, {
					props: {
						groupByFn: grpByFn,
					},
				});
			};

			const handleGroupByChange = (labels: string[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						groupBy: JSON.stringify(labels),
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

			const handleMetricClick = (labels: Record<string, string>) => {
				setSelectedLabels(labels);
				setDetailOpen(true);
			};

			const getHealthColor = (value: number): string => {
				const min = healthMin ? Number.parseFloat(healthMin) : null;
				const max = healthMax ? Number.parseFloat(healthMax) : null;

				// If no health interval is set, return green (default healthy)
				if (min === null && max === null) {
					return "text-green-700";
				}

				// Check if value is outside the healthy range
				if (min !== null && !Number.isNaN(min) && value < min) {
					return "text-red-700"; // Below minimum - unhealthy
				}
				if (max !== null && !Number.isNaN(max) && value > max) {
					return "text-red-700"; // Above maximum - unhealthy
				}

				return "text-green-700"; // Within healthy range
			};

			// Render content based on state
			const renderContent = () => {
				if (!metricName) {
					return (
						<EmptyState
							icon={RectangleHorizontal}
							title="No metric selected"
							description="Select a metric to view its value."
						/>
					);
				}

				if ((metricsLoading || loading) && scalarData === null) {
					return (
						<Card className="@container/card shadow-none">
							<CardHeader>
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-8 w-24" />
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5">
								<Skeleton className="h-3 w-48" />
							</CardFooter>
						</Card>
					);
				}

				if (!selectedMetric) {
					return (
						<EmptyState
							icon={SquareDot}
							title="Metric not found"
							description="The selected metric could not be loaded."
						/>
					);
				}

				if (scalarData === null || scalarData.length === 0) {
					return (
						<Card className="@container/card shadow-none">
							<CardHeader className="relative pb-3">
								<CardDescription>
									{title || selectedMetric.prettyName}
								</CardDescription>
								<CardTitle
									className={cn(
										"text-2xl font-semibold @[250px]/card:text-3xl",
									)}
								>
									—
								</CardTitle>
							</CardHeader>
							{
								<CardFooter className="flex flex-wrap gap-1.5 p-3 pt-0"></CardFooter>
							}
						</Card>
					);
				}

				return (
					<div className="outline-none flex flex-col gap-1">
						{scalarData.map((scalar) => renderScalarCard(scalar))}
					</div>
				);
			};

			const renderScalarCard = (scalar: {
				labels: Record<string, string>;
				value: number;
			}) => {
				if (!selectedMetric) return null;

				// For match timeAggregation type, display as percentage
				const isMatchRate = timeAggregation === "match";
				const formatted = formatMetricValue(
					scalar.value,
					isMatchRate ? "%" : (selectedMetric.unit ?? undefined),
					selectedMetric.transform,
				);

				const colorClass =
					healthMin || healthMax ? getHealthColor(scalar.value) : "";

				// Generate description based on timeAggregation type
				const getDescription = () => {
					if (title) return title;
					if (isMatchRate) {
						return `${selectedMetric.prettyName} ${matchOperator} ${matchValue}`;
					}
					if (!selectedMetric.transform && selectedMetric.type === "counter")
						return `${selectedMetric.prettyName} - Increase`;
					if (timeAggregation === "last") {
						return `${selectedMetric.prettyName} - Last value`;
					}
					if (timeAggregation === "avg") {
						return `${selectedMetric.prettyName} - Average over time`;
					}
					if (timeAggregation === "min") {
						return `${selectedMetric.prettyName} - Minimum over time`;
					}
					if (timeAggregation === "max") {
						return `${selectedMetric.prettyName} - Maximum over time`;
					}
					return selectedMetric.prettyName;
				};

				return (
					<div className="group">
						<Card className="@container/card shadow-none">
							<CardHeader className="relative pb-3">
								<div
									className="absolute right-3 top-0 px-2 py-1.5 rounded-b-lg border border-t-0 bg-background group-hover:opacity-100 transition-opacity cursor-pointer z-10 flex items-center gap-1.5 opacity-0 shadow-xs"
									onClick={() => handleMetricClick(scalar.labels)}
								>
									<ChartLine className="size-4 text-muted-foreground" />
									<span className="text-xs text-muted-foreground whitespace-nowrap">
										History
									</span>
								</div>
								<CardDescription>{getDescription()}</CardDescription>
								<CardTitle
									className={cn(
										"text-2xl font-semibold @[250px]/card:text-3xl",
										colorClass,
									)}
								>
									{formatted.formattedValue}
									{formatted.displayUnit && (
										<span
											className={cn(
												"text-muted-foreground ml-2 text-xl",
												colorClass,
											)}
										>
											{formatted.displayUnit}
										</span>
									)}
								</CardTitle>
							</CardHeader>
							{
								<CardFooter className="flex flex-wrap gap-1.5 p-3 pt-0">
									{Object.entries(scalar.labels).map(([key, value]) => (
										<LabelBadge key={key} labelKey={key} labelValue={value} />
									))}
								</CardFooter>
							}
						</Card>
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
								<SheetTitle>Metric Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Title
									</h3>
									<Input
										placeholder="Optional title..."
										value={title}
										onChange={(e) => {
											props.editor.updateBlock(props.block, {
												props: {
													title: e.target.value,
												},
											});
										}}
									/>
								</div>

								<div className="space-y-3">
									<InstantMetricSelector
										metrics={instantMetrics}
										selectedMetric={selectedMetric ?? null}
										selectedTimeAggregation={timeAggregation}
										selectedGroupBy={groupBy}
										selectedGroupByFn={groupByFn}
										onMetricSelect={handleMetricSelect}
										onTimeAggregationChange={handleTimeAggregationChange}
										onGroupByChange={handleGroupByChange}
										onGroupByFnChange={handleGroupByFnChange}
										onFiltersChange={handleFiltersChange}
										blockFilters={blockFilters}
										matchOperator={matchOperator}
										matchValue={matchValue}
										onMatchConditionChange={(operator, value) => {
											props.editor.updateBlock(props.block, {
												props: {
													matchOperator: operator,
													matchValue: value,
												},
											});
										}}
									/>
								</div>

								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Health Interval (Optional)
									</h3>
									<div className="flex gap-2">
										<Input
											type="number"
											placeholder="Min"
											value={healthMin}
											onChange={(e) => {
												props.editor.updateBlock(props.block, {
													props: {
														healthMin: e.target.value,
													},
												});
											}}
										/>
										<Input
											type="number"
											placeholder="Max"
											value={healthMax}
											onChange={(e) => {
												props.editor.updateBlock(props.block, {
													props: {
														healthMax: e.target.value,
													},
												});
											}}
										/>
									</div>
									<p className="text-xs text-muted-foreground">
										Values outside this range will be shown in red
									</p>
								</div>
							</div>
						</SheetContent>
					</Sheet>

					{/* Metric Detail Drawer */}
					{rangeMetric && startDate !== null && endDate !== null && (
						<MetricDetailDrawer
							metric={rangeMetric}
							tenantName={tenantName}
							filters={[
								...filters,
								...Object.entries(selectedLabels).map(([key, value]) => ({
									label: key,
									value: value,
								})),
							]}
							open={detailOpen}
							startDate={startDate}
							endDate={endDate}
							onOpenChange={setDetailOpen}
						/>
					)}
				</>
			);
		},
	},
)();
