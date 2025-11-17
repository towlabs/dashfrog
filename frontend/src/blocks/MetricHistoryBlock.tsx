"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ChartLine } from "lucide-react";
import { useEffect, useState } from "react";
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
import {
	type MetricHistoryResponse,
	Metrics,
} from "@/src/services/api/metrics";
import { useNotebooksStore } from "@/src/stores/notebooks";
import { useTenantStore } from "@/src/stores/tenant";
import { MetricAggregationLabel, type Metric } from "@/src/types/metric";
import { resolveTimeWindow } from "@/src/types/timewindow";

export const MetricHistoryBlock = createReactBlockSpec(
	{
		type: "metricHistory" as const,
		propSchema: {
			metricName: {
				default: "",
			},
		},
		content: "none",
	},
	{
		render: (props) => {
			const { tenant } = useParams<{ tenant: string }>();
			const tenantName = tenant ? decodeURIComponent(tenant) : "";
			const timeWindow = useTenantStore((state) => state.timeWindow);
			const filters = useTenantStore((state) => state.filters);
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

			const [historyData, setHistoryData] =
				useState<MetricHistoryResponse | null>(null);
			const [loading, setLoading] = useState(false);
			const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);

			const metricName = props.block.props.metricName as string;

			// Update selected metric when metricName or available metrics change
			useEffect(() => {
				if (!metricName || metrics.length === 0) {
					setSelectedMetric(null);
					return;
				}

				const metric = metrics.find((m) => m.name === metricName);
				setSelectedMetric(metric || null);
			}, [metricName, metrics]);

			// Fetch metric history when metric is selected
			useEffect(() => {
				if (!tenantName || !selectedMetric) {
					setHistoryData(null);
					return;
				}

				const fetchHistory = async () => {
					setLoading(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);
						const response = await Metrics.getHistory(
							tenantName,
							selectedMetric.name,
							selectedMetric.unit,
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

			const handleMetricSelect = (selectedMetricName: string) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						metricName: selectedMetricName,
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

				return (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-semibold">
									{MetricAggregationLabel[selectedMetric.aggregation]} Of{" "}
									{selectedMetric.name}
								</h3>
							</div>
						</div>
						<MetricHistoryChart
							historyData={historyData}
							metric={selectedMetric}
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
