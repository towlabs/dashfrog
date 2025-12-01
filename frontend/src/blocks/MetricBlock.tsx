"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ChartLine } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { LabelBadge } from "@/components/LabelBadge";
import { MetricDetailDrawer } from "@/components/MetricDetailDrawer";
import { MetricSelector } from "@/components/MetricSelector";
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

import { cn } from "@/lib/utils";
import { type MetricScalar, Metrics } from "@/src/services/api/metrics";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import type {
	GroupByFn,
	Metric,
	TimeAggregation,
	Transform,
} from "@/src/types/metric";
import { formatMetricValue } from "@/src/utils/metricFormatting";

export const MetricBlock = createReactBlockSpec(
	{
		type: "metric" as const,
		propSchema: {
			metricId: {
				default: "",
			},
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
			transformMetadata: {
				default: "{}",
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
			const metrics = useNotebooksStore((state) => state.metrics);

			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const startDate = useNotebooksStore((state) => state.startDate);
			const endDate = useNotebooksStore((state) => state.endDate);
			const currentNotebookId = useNotebooksStore(
				(state) => state.currentNotebook?.id,
			);
			const [scalarData, setScalarData] = useState<MetricScalar | null>(null);
			const [loading, setLoading] = useState(false);
			const [detailOpen, setDetailOpen] = useState(false);
			const [selectedLabels, setSelectedLabels] = useState<
				Record<string, string>
			>({});

			const metricId = props.block.props.metricId as string;
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
			const transformMetadata: any = useMemo(() => {
				try {
					return JSON.parse(props.block.props.transformMetadata as string);
				} catch {
					return {};
				}
			}, [props.block.props.transformMetadata]);

			// Merge notebook filters with block filters
			const filters = useMemo(
				() => [...(notebookFilters || []), ...blockFilters],
				[notebookFilters, blockFilters],
			);

			const selectedMetric = React.useMemo(() => {
				return metrics.find((m) => m.id === metricId);
			}, [metricId, metrics]);

			// Fetch scalar data when metric and aggregation are selected
			useEffect(() => {
				if (
					!tenantName ||
					!metricName ||
					startDate === null ||
					endDate === null ||
					filters === undefined ||
					!currentNotebookId
				) {
					setScalarData(null);
					return;
				}

				const fetchScalar = async () => {
					if (timeAggregation === "match" && !matchValue) {
						setScalarData(null);
						return;
					}

					setLoading(true);
					try {
						const response = await Metrics.getScalar(
							tenantName,
							metricName,
							startDate,
							endDate,
							transform || null,
							transformMetadata,
							groupBy,
							groupByFn,
							timeAggregation,
							matchOperator,
							matchValue,
							filters,
							currentNotebookId,
						);
						setScalarData(response);
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
				transform,
				transformMetadata,
				timeAggregation,
				groupBy,
				groupByFn,
				matchOperator,
				matchValue,
				startDate,
				endDate,
				filters,
				currentNotebookId,
				metricName,
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
						metricId: metric.id,
						metricName: metric.prometheusName,
						groupBy: metric.type === "gauge" ? "avg" : "sum",
					},
				});
			};

			const handleTransformChange = (
				transform: Transform | null,
				metadata: any,
			) => {
				props.editor.updateBlock(props.block, {
					props: {
						transform: transform || "",
						transformMetadata: JSON.stringify(metadata),
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
				if (loading && scalarData === null && selectedMetric) {
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

				if (scalarData === null || scalarData.scalars.length === 0) {
					return (
						<Card className="@container/card shadow-none">
							<CardHeader className="relative pb-3">
								<CardDescription>
									{title || scalarData?.prettyName || "N/A"}
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
						{scalarData.scalars.map((scalar) => renderScalarCard(scalar))}
					</div>
				);
			};

			const renderScalarCard = (scalar: {
				labels: Record<string, string>;
				value: number;
			}) => {
				// For match timeAggregation type, display as percentage
				const isMatchRate = timeAggregation === "match";
				const formatted = formatMetricValue(
					scalar.value,
					isMatchRate ? "%" : (scalarData?.unit ?? undefined),
					transform || null,
				);

				const colorClass =
					healthMin || healthMax ? getHealthColor(scalar.value) : "";

				// Generate description based on timeAggregation type
				const getDescription = () => {
					if (title) return title;
					if (!scalarData) return "N/A";
					if (isMatchRate) {
						return `${scalarData.prettyName} ${matchOperator} ${matchValue}`;
					}
					if (transform === "increase")
						return `${scalarData.prettyName} - Increase`;
					if (transform === "ratio") return `${scalarData.prettyName} - Ratio`;
					if (timeAggregation === "last") {
						return `${scalarData.prettyName} - Last value`;
					}
					if (timeAggregation === "avg") {
						return `${scalarData.prettyName} - Average over time`;
					}
					if (timeAggregation === "min") {
						return `${scalarData.prettyName} - Minimum over time`;
					}
					if (timeAggregation === "max") {
						return `${scalarData.prettyName} - Maximum over time`;
					}
					return scalarData.prettyName;
				};

				return (
					<div
						className="group"
						key={Object.entries(scalar.labels)
							.map(([key, value]) => `${key}:${value}`)
							.join(",")}
					>
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
									<MetricSelector
										metrics={metrics}
										selectedMetric={selectedMetric ?? null}
										selectedTimeAggregation={timeAggregation}
										selectedGroupBy={groupBy}
										selectedGroupByFn={groupByFn}
										selectedTransform={transform || null}
										onMetricSelect={handleMetricSelect}
										onTransformChange={handleTransformChange}
										onTimeAggregationChange={handleTimeAggregationChange}
										onGroupByChange={handleGroupByChange}
										onGroupByFnChange={handleGroupByFnChange}
										onFiltersChange={handleFiltersChange}
										blockFilters={blockFilters}
										matchOperator={matchOperator}
										matchValue={matchValue}
										selectedTransformMetadata={transformMetadata}
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
					{startDate !== null && endDate !== null && currentNotebookId && (
						<MetricDetailDrawer
							metricName={metricName ?? ""}
							prettyName={scalarData?.prettyName ?? ""}
							transformMetadata={transformMetadata}
							transform={
								!transform && scalarData?.type === "counter"
									? "ratePerSecond"
									: transform
							}
							unit={scalarData?.unit ?? null}
							tenantName={tenantName}
							groupBy={groupBy}
							groupByFn={groupByFn}
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
							notebookId={currentNotebookId}
						/>
					)}
				</>
			);
		},
	},
)();
