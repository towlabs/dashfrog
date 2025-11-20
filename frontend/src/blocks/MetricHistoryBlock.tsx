"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ChartLine } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { MetricHistoryChart } from "@/components/MetricHistoryChart";
import { MetricSelector } from "@/components/MetricSelector";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { type MetricHistoryPoint, Metrics } from "@/src/services/api/metrics";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Metric, MetricAggregation } from "@/src/types/metric";
import { resolveTimeWindow } from "@/src/types/timewindow";

export const MetricHistoryBlock = createReactBlockSpec(
	{
		type: "metricHistory" as const,
		propSchema: {
			metricName: {
				default: "",
			},
			spatialAggregation: {
				default: "" as MetricAggregation | "",
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
			const metrics = useNotebooksStore((state) => state.metrics);
			const metricsLoading = useNotebooksStore((state) => state.metricsLoading);
			const timeWindow = useNotebooksStore(
				(state) => state.currentNotebook?.timeWindow,
			);
			const filters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);

			const [historyData, setHistoryData] = useState<{
				series: {
					labels: Record<string, string>;
					values: MetricHistoryPoint[];
				}[];
			} | null>(null);
			const [loading, setLoading] = useState(false);

			const metricName = props.block.props.metricName as string;
			const spatialAggregation = props.block.props.spatialAggregation as
				| MetricAggregation
				| "";

			const selectedMetric = React.useMemo(() => {
				return metrics.find(
					(m) =>
						m.prometheusName === metricName &&
						m.aggregation === spatialAggregation,
				);
			}, [metricName, spatialAggregation, metrics]);

			// Fetch metric history when metric is selected
			useEffect(() => {
				if (
					!tenantName ||
					!selectedMetric ||
					timeWindow === undefined ||
					filters === undefined
				) {
					setHistoryData(null);
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
						setHistoryData(null);
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

			const handleMetricSelect = (metric: Metric) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						metricName: metric.prometheusName,
						spatialAggregation: metric.aggregation,
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

				if (loading) {
					return (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>Loading metric history...</p>
						</div>
					);
				}

				if (!selectedMetric) {
					return (
						<EmptyState
							icon={ChartLine}
							title="Metric not found"
							description="The selected metric could not be loaded."
						/>
					);
				}

				if (!historyData || historyData.series.length === 0) {
					return (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>No metric history data available</p>
						</div>
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
									{selectedMetric.prettyName}
								</h3>
							</div>
						</div>
						<MetricHistoryChart
							historyData={historyData}
							metric={selectedMetric}
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
									<Label className="text-sm font-medium">Metric</Label>
									<MetricSelector
										metrics={metrics}
										metricsLoading={metricsLoading}
										selectedMetricName={metricName}
										selectedSpatialAggregation={
											selectedMetric?.aggregation ?? ""
										}
										onMetricSelect={handleMetricSelect}
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
