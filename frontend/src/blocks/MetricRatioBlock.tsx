"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { RectangleHorizontal, SquareDivide } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
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
import { Metrics, MetricScalar } from "@/src/services/api/metrics";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type {
	GroupByFn,
	InstantMetric,
	TimeAggregation,
	Transform,
} from "@/src/types/metric";
import type { Filter } from "../types/filter";

export const MetricRatioBlock = createReactBlockSpec(
	{
		type: "metricRatio" as const,
		propSchema: {
			title: {
				default: "",
			},
			// Query A (numerator)
			metricAName: {
				default: "",
			},
			transformA: {
				default: "" as Transform | "",
			},
			timeAggregationA: {
				default: "last" as TimeAggregation,
			},
			groupByA: {
				default: "[]",
			},
			groupByFnA: {
				default: "sum" as GroupByFn,
			},
			matchOperatorA: {
				default: "==" as "==" | ">" | "<" | ">=" | "<=" | "!=",
			},
			matchValueA: {
				default: "",
			},
			filtersA: {
				default: "[]",
			},
			// Query B (denominator)
			metricBName: {
				default: "",
			},
			transformB: {
				default: "" as Transform | "",
			},
			timeAggregationB: {
				default: "last" as TimeAggregation,
			},
			groupByB: {
				default: "[]",
			},
			groupByFnB: {
				default: "sum" as GroupByFn,
			},
			matchOperatorB: {
				default: "==" as "==" | ">" | "<" | ">=" | "<=" | "!=",
			},
			matchValueB: {
				default: "",
			},
			filtersB: {
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
			// const metricsLoading = useNotebooksStore((state) => state.metricsLoading);
			const startDate = useNotebooksStore((state) => state.startDate);
			const endDate = useNotebooksStore((state) => state.endDate);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const currentNotebookId = useNotebooksStore(
				(state) => state.currentNotebook?.id,
			);
			const [scalarDataA, setScalarDataA] = useState<MetricScalar | null>(null);
			const [scalarDataB, setScalarDataB] = useState<MetricScalar | null>(null);

			const [loading, setLoading] = useState(false);

			const title = props.block.props.title as string;
			const metricAName = props.block.props.metricAName as string;
			const transformA = props.block.props.transformA as Transform | "";
			const timeAggregationA = props.block.props
				.timeAggregationA as TimeAggregation;
			const groupByFnA = props.block.props.groupByFnA as GroupByFn;
			const matchOperatorA = props.block.props.matchOperatorA as
				| "=="
				| ">"
				| "<"
				| ">="
				| "<="
				| "!=";
			const matchValueA = props.block.props.matchValueA as string;

			const metricBName = props.block.props.metricBName as string;
			const transformB = props.block.props.transformB as Transform | "";
			const timeAggregationB = props.block.props
				.timeAggregationB as TimeAggregation;
			const groupByFnB = props.block.props.groupByFnB as GroupByFn;
			const matchOperatorB = props.block.props.matchOperatorB as
				| "=="
				| ">"
				| "<"
				| ">="
				| "<="
				| "!=";
			const matchValueB = props.block.props.matchValueB as string;

			// Parse groupBy labels from JSON strings
			const groupByA: string[] = useMemo(() => {
				try {
					return JSON.parse(props.block.props.groupByA as string);
				} catch {
					return [];
				}
			}, [props.block.props.groupByA]);

			const groupByB: string[] = useMemo(() => {
				try {
					return JSON.parse(props.block.props.groupByB as string);
				} catch {
					return [];
				}
			}, [props.block.props.groupByB]);

			// Parse filters from JSON strings
			const filtersA = useMemo(() => {
				try {
					return JSON.parse(props.block.props.filtersA as string);
				} catch {
					return [];
				}
			}, [props.block.props.filtersA]);

			const filtersB = useMemo(() => {
				try {
					return JSON.parse(props.block.props.filtersB as string);
				} catch {
					return [];
				}
			}, [props.block.props.filtersB]);

			const metricA = React.useMemo(() => {
				return instantMetrics.find(
					(m) =>
						m.prometheusName === metricAName &&
						m.transform === (transformA || null),
				);
			}, [metricAName, transformA, instantMetrics]);

			const metricB = React.useMemo(() => {
				return instantMetrics.find(
					(m) =>
						m.prometheusName === metricBName &&
						m.transform === (transformB || null),
				);
			}, [metricBName, transformB, instantMetrics]);

			// Merge notebook filters with block filters
			const filtersCombinedA = useMemo(
				() => [...(notebookFilters || []), ...filtersA],
				[notebookFilters, filtersA],
			);
			const filtersCombinedB = useMemo(
				() => [...(notebookFilters || []), ...filtersB],
				[notebookFilters, filtersB],
			);

			// Fetch both metric A and metric B values
			useEffect(() => {
				if (
					!tenantName ||
					!metricAName ||
					!metricBName ||
					startDate === null ||
					endDate === null ||
					filtersCombinedA === undefined ||
					filtersCombinedB === undefined ||
					!currentNotebookId
				) {
					setScalarDataA(null);
					setScalarDataB(null);
					return;
				}

				const fetchValues = async () => {
					setLoading(true);
					try {
						// Fetch Metric A
						const responseA = await Metrics.getScalar(
							tenantName,
							metricAName,
							startDate,
							endDate,
							transformA || null,
							groupByA,
							groupByFnA,
							timeAggregationA,
							matchOperatorA,
							matchValueA,
							filtersCombinedA,
							currentNotebookId,
						);

						// Fetch Metric B
						const responseB = await Metrics.getScalar(
							tenantName,
							metricBName,
							startDate,
							endDate,
							transformB || null,
							groupByB,
							groupByFnB,
							timeAggregationB,
							matchOperatorB,
							matchValueB,
							filtersCombinedB,
							currentNotebookId,
						);

						setScalarDataA(responseA);
						setScalarDataB(responseB);
					} catch (error) {
						console.error("Failed to fetch metric ratio:", error);
						setScalarDataA(null);
						setScalarDataB(null);
					} finally {
						setLoading(false);
					}
				};

				void fetchValues();
			}, [
				tenantName,
				metricAName,
				transformA,
				metricBName,
				transformB,
				timeAggregationA,
				timeAggregationB,
				groupByA,
				groupByB,
				groupByFnA,
				groupByFnB,
				matchOperatorA,
				matchValueA,
				matchOperatorB,
				matchValueB,
				startDate,
				endDate,
				filtersCombinedA,
				filtersCombinedB,
				currentNotebookId,
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

			// Handlers for Metric A
			const handleMetricASelect = (metric: InstantMetric) => {
				props.editor.updateBlock(props.block, {
					props: {
						metricAName: metric.prometheusName,
						transformA: metric.transform || "",
					},
				});
			};

			const handleTimeAggregationAChange = (timeAgg: TimeAggregation) => {
				props.editor.updateBlock(props.block, {
					props: {
						timeAggregationA: timeAgg,
					},
				});
			};

			const handleGroupByAChange = (labels: string[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						groupByA: JSON.stringify(labels),
					},
				});
			};

			const handleGroupByFnAChange = (grpByFn: GroupByFn) => {
				props.editor.updateBlock(props.block, {
					props: {
						groupByFnA: grpByFn,
					},
				});
			};

			const handleFiltersAChange = (newFilters: Filter[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						filtersA: JSON.stringify(newFilters),
					},
				});
			};

			// Handlers for Metric B
			const handleMetricBSelect = (metric: InstantMetric) => {
				props.editor.updateBlock(props.block, {
					props: {
						metricBName: metric.prometheusName,
						transformB: metric.transform || "",
					},
				});
			};

			const handleTimeAggregationBChange = (timeAgg: TimeAggregation) => {
				props.editor.updateBlock(props.block, {
					props: {
						timeAggregationB: timeAgg,
					},
				});
			};

			const handleGroupByBChange = (labels: string[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						groupByB: JSON.stringify(labels),
					},
				});
			};

			const handleGroupByFnBChange = (grpByFn: GroupByFn) => {
				props.editor.updateBlock(props.block, {
					props: {
						groupByFnB: grpByFn,
					},
				});
			};

			const handleFiltersBChange = (newFilters: Filter[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						filtersB: JSON.stringify(newFilters),
					},
				});
			};

			// Calculate percentage
			const calculateDisplay = () => {
				if (!scalarDataA || !scalarDataB) {
					return { value: "—", suffix: "" };
				}

				const sumA = scalarDataA.scalars.reduce((sum, s) => sum + s.value, 0);
				const sumB = scalarDataB.scalars.reduce((sum, s) => sum + s.value, 0);

				if (sumB === 0) {
					return { value: "—", suffix: "" };
				}

				const percentage = (sumA / sumB) * 100;
				return {
					value: percentage.toFixed(1),
					suffix: "%",
				};
			};

			// Render content based on state
			const renderContent = () => {
				if (!metricAName || !metricBName) {
					return (
						<EmptyState
							icon={SquareDivide}
							title="No metrics selected"
							description="Select metrics for Metric A and Metric B."
						/>
					);
				}

				if (loading && scalarDataA === null && scalarDataB === null) {
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

				if (!metricAName || !metricBName) {
					return (
						<EmptyState
							icon={RectangleHorizontal}
							title="Metric not found"
							description="One or more selected metrics could not be loaded."
						/>
					);
				}

				const { value, suffix } = calculateDisplay();

				return (
					<div className="outline-none flex flex-col gap-1">
						<Card className="@container/card shadow-none">
							<CardHeader>
								<CardDescription>
									{title ||
										`${scalarDataA?.prettyName} / ${scalarDataB?.prettyName}`}
								</CardDescription>
								<CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl">
									{value}
									<span className="text-muted-foreground ml-2 text-xl">
										{suffix}
									</span>
								</CardTitle>
							</CardHeader>
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
								<SheetTitle>Metric Ratio Settings</SheetTitle>
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

								<div className="space-y-3 mt-6 p-3 border rounded-lg bg-muted/30">
									<h3 className="text-sm font-medium">Metric A (Numerator)</h3>
									<InstantMetricSelector
										disableGroupBy={true}
										metrics={instantMetrics}
										selectedMetric={metricA ?? null}
										selectedTimeAggregation={timeAggregationA}
										selectedGroupBy={groupByA}
										selectedGroupByFn={groupByFnA}
										blockFilters={filtersA}
										matchOperator={matchOperatorA}
										matchValue={matchValueA}
										onMetricSelect={handleMetricASelect}
										onTimeAggregationChange={handleTimeAggregationAChange}
										onGroupByChange={handleGroupByAChange}
										onGroupByFnChange={handleGroupByFnAChange}
										onFiltersChange={handleFiltersAChange}
										onMatchConditionChange={(operator, value) => {
											props.editor.updateBlock(props.block, {
												props: {
													matchOperatorA: operator,
													matchValueA: value,
												},
											});
										}}
									/>
								</div>

								<div className="space-y-3 p-3 border rounded-lg bg-muted/30">
									<h3 className="text-sm font-medium">
										Metric B (Denominator)
									</h3>
									<InstantMetricSelector
										disableGroupBy={true}
										metrics={instantMetrics}
										selectedMetric={metricB ?? null}
										selectedTimeAggregation={timeAggregationB}
										selectedGroupBy={groupByB}
										selectedGroupByFn={groupByFnB}
										blockFilters={filtersB}
										matchOperator={matchOperatorB}
										matchValue={matchValueB}
										onMetricSelect={handleMetricBSelect}
										onTimeAggregationChange={handleTimeAggregationBChange}
										onGroupByChange={handleGroupByBChange}
										onGroupByFnChange={handleGroupByFnBChange}
										onFiltersChange={handleFiltersBChange}
										onMatchConditionChange={(operator, value) => {
											props.editor.updateBlock(props.block, {
												props: {
													matchOperatorB: operator,
													matchValueB: value,
												},
											});
										}}
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
