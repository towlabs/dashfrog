"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ChartLine } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { MetricHistoryChart } from "@/components/MetricHistoryChart";
import { RangeMetricSelector } from "@/components/MetricSelector";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { type MetricHistoryPoint, Metrics } from "@/src/services/api/metrics";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { RangeAggregation, RangeMetric } from "../types/metric";

export const MetricHistoryBlock = createReactBlockSpec(
	{
		type: "metricHistory" as const,
		propSchema: {
			metricName: {
				default: "",
			},
			aggregation: {
				default: "" as RangeAggregation | "",
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
			const openBlockSettings = useNotebooksStore(
				(state) => state.openBlockSettings,
			);
			const labels = useLabelsStore((state) => state.labels);
			const rangeMetrics = useNotebooksStore((state) => state.rangeMetrics);
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

			const [historyData, setHistoryData] = useState<{
				series: {
					labels: Record<string, string>;
					values: MetricHistoryPoint[];
				}[];
			}>({ series: [] });
			const [loading, setLoading] = useState(false);

			const metricName = props.block.props.metricName as string;
			const aggregation = props.block.props.aggregation as
				| RangeAggregation
				| "";

			const selectedMetric = React.useMemo(() => {
				return rangeMetrics.find(
					(m) =>
						m.prometheusName === metricName && m.aggregation === aggregation,
				);
			}, [metricName, aggregation, rangeMetrics]);

			// Fetch metric history when metric is selected
			useEffect(() => {
				if (
					!tenantName ||
					!selectedMetric ||
					timeWindow === undefined ||
					filters === undefined
				) {
					setHistoryData({ series: [] });
					return;
				}

				const fetchHistory = async () => {
					setLoading(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);
						const response = await Metrics.getHistory(
							tenantName,
							selectedMetric.prometheusName,
							selectedMetric.aggregation,
							start,
							end,
							filters,
						);
						setHistoryData(response);
					} catch (error) {
						console.error("Failed to fetch metric history:", error);
						setHistoryData({ series: [] });
					} finally {
						setLoading(false);
					}
				};

				void fetchHistory();
			}, [tenantName, selectedMetric, timeWindow, filters]);

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

			const handleMetricSelect = (metric: RangeMetric) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						metricName: metric.prometheusName,
						aggregation: metric.aggregation,
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

			// Render content based on state
			const renderContent = () => {
				if (!metricName) {
					return (
						<EmptyState
							icon={ChartLine}
							title="No metric selected"
							description="Select a metric to view its history."
							onClick={() => openBlockSettings(props.block.id)}
							className="cursor-pointer"
						/>
					);
				}

				if (!timeWindow) {
					return (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>No time window configured</p>
						</div>
					);
				}

				return (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-semibold">
									{selectedMetric?.prettyName ?? ""}
								</h3>
							</div>
						</div>
						<MetricHistoryChart
							historyData={historyData}
							metric={selectedMetric ?? null}
							timeWindow={timeWindow}
						/>
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
								<SheetTitle>Metric History Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Metric
									</h3>
									<RangeMetricSelector
										metrics={rangeMetrics}
										metricsLoading={metricsLoading}
										selectedMetric={selectedMetric ?? null}
										onMetricSelect={handleMetricSelect}
									/>
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
