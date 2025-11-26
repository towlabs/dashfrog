"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { RectangleHorizontal, SquareDivide } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Metrics } from "@/src/services/api/metrics";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { InstantMetric, Show } from "@/src/types/metric";
import { resolveTimeWindow } from "@/src/types/timewindow";
import React from "react";
import { Filter } from "../types/filter";

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
			aggregationA: {
				default: "",
			},
			showA: {
				default: "last" as Show,
			},
			filtersA: {
				default: "[]",
			},
			// Query B (denominator)
			metricBName: {
				default: "",
			},
			aggregationB: {
				default: "",
			},
			showB: {
				default: "last" as Show,
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
			const metricsLoading = useNotebooksStore((state) => state.metricsLoading);
			const timeWindow = useNotebooksStore(
				(state) => state.currentNotebook?.timeWindow,
			);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);

			const [valueA, setValueA] = useState<number | null>(null);
			const [valueB, setValueB] = useState<number | null>(null);
			const [loading, setLoading] = useState(false);

			const title = props.block.props.title as string;
			const metricAName = props.block.props.metricAName as string;
			const aggregationA = props.block.props.aggregationA as string;
			const showA = props.block.props.showA as Show;
			const metricBName = props.block.props.metricBName as string;
			const aggregationB = props.block.props.aggregationB as string;
			const showB = props.block.props.showB as Show;

			// Parse filters from JSON strings (remove notebookFilters from here, use MetricSelector)
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
						m.prometheusName === metricAName && m.aggregation === aggregationA,
				);
			}, [metricAName, aggregationA, instantMetrics]);

			const metricB = React.useMemo(() => {
				return instantMetrics.find(
					(m) =>
						m.prometheusName === metricBName && m.aggregation === aggregationB,
				);
			}, [metricBName, aggregationB, instantMetrics]);

			// Fetch both metric A and metric B values
			useEffect(() => {
				if (
					!tenantName ||
					!metricA ||
					!metricB ||
					timeWindow === undefined ||
					notebookFilters === undefined
				) {
					setValueA(null);
					setValueB(null);
					return;
				}

				const fetchValues = async () => {
					setLoading(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);

						// Fetch Metric A
						const filtersCombinedA = [...notebookFilters, ...filtersA];
						const responseA = await Metrics.getScalar(
							tenantName,
							metricA.prometheusName,
							start,
							end,
							metricA.aggregation,
							showA,
							null,
							null,
							filtersCombinedA,
						);

						// Fetch Metric B
						const filtersCombinedB = [...notebookFilters, ...filtersB];
						const responseB = await Metrics.getScalar(
							tenantName,
							metricB.prometheusName,
							start,
							end,
							metricB.aggregation,
							showB,
							null,
							null,
							filtersCombinedB,
						);

						// Sum all values
						const sumA = responseA.scalar;
						const sumB = responseB.scalar;

						setValueA(sumA);
						setValueB(sumB);
					} catch (error) {
						console.error("Failed to fetch metric ratio:", error);
						setValueA(null);
						setValueB(null);
					} finally {
						setLoading(false);
					}
				};

				void fetchValues();
			}, [
				tenantName,
				metricA,
				metricB,
				showA,
				showB,
				timeWindow,
				notebookFilters,
				filtersA,
				filtersB,
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

			const handleMetricASelect = (metric: InstantMetric, show: Show) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						metricAName: metric.prometheusName,
						aggregationA: metric.aggregation,
						showA: show,
					},
				});
			};

			const handleFiltersAChange = (newFilters: Filter[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						filtersA: JSON.stringify(newFilters),
					},
				});
			};

			const handleMetricBSelect = (metric: InstantMetric, show: Show) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						metricBName: metric.prometheusName,
						aggregationB: metric.aggregation,
						showB: show,
					},
				});
			};

			const handleFiltersBChange = (newFilters: Filter[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						filtersB: JSON.stringify(newFilters),
					},
				});
			};

			// Calculate percentage
			const calculateDisplay = () => {
				if (valueA === null || valueB === null || valueB === 0) {
					return { value: "—", suffix: "" };
				}

				const percentage = (valueA / valueB) * 100;
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

				if ((metricsLoading || loading) && valueA === null && valueB === null) {
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

				if (!metricA || !metricB) {
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
									{title || `${metricA.prettyName} / ${metricB.prettyName}`}
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
													...props.block.props,
													title: e.target.value,
												},
											});
										}}
									/>
								</div>

								<div className="space-y-3 mt-6 p-3 border rounded-lg bg-muted/30">
									<h3 className="text-sm font-medium">Metric A (Top)</h3>
									<InstantMetricSelector
										metrics={instantMetrics}
										selectedMetric={metricA ?? null}
										selectedShow={showA}
										blockFilters={filtersA}
										onMetricSelect={handleMetricASelect}
										onFiltersChange={handleFiltersAChange}
									/>
								</div>

								<div className="space-y-3 p-3 border rounded-lg bg-muted/30">
									<h3 className="text-sm font-medium">Metric B (Bottom)</h3>
									<InstantMetricSelector
										metrics={instantMetrics}
										selectedMetric={metricB ?? null}
										selectedShow={showB}
										blockFilters={filtersB}
										onMetricSelect={handleMetricBSelect}
										onFiltersChange={handleFiltersBChange}
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
