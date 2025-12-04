"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ChartLine } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { MetricHistoryChart } from "@/components/MetricHistoryChart";
import { MetricSelector } from "@/components/MetricSelector";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { type MetricRangeHistory, Metrics } from "@/src/services/api/metrics";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import type { GroupByFn, Metric, Transform } from "../types/metric";

export const MetricHistoryBlock = createReactBlockSpec(
	{
		type: "metricHistory" as const,
		propSchema: {
			metricId: {
				default: "",
			},
			metricName: {
				default: "",
			},
			transform: {
				default: "" as Transform | "",
			},
			transformMetadata: {
				default: "{}",
			},
			groupBy: {
				default: "[]",
			},
			groupByFn: {
				default: "sum" as GroupByFn,
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
			const metrics = useNotebooksStore((state) => state.metrics);
			const startDate = useNotebooksStore((state) => state.startDate);
			const endDate = useNotebooksStore((state) => state.endDate);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const currentNotebookId = useNotebooksStore(
				(state) => state.currentNotebook?.id,
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

			const [historyData, setHistoryData] = useState<MetricRangeHistory>({
				prettyName: "",
				unit: null,
				transform: null,
				series: [],
			});
			const [_, setLoading] = useState(false);

			const metricId = props.block.props.metricId as string;
			const transform = props.block.props.transform as Transform | "";
			const metricName = props.block.props.metricName as string;
			const groupBy: string[] = useMemo(() => {
				try {
					return JSON.parse(props.block.props.groupBy as string);
				} catch {
					return [];
				}
			}, [props.block.props.groupBy]);
			const groupByFn = props.block.props.groupByFn as GroupByFn;
			const transformMetadata: any = useMemo(() => {
				try {
					return JSON.parse(props.block.props.transformMetadata as string);
				} catch {
					return {};
				}
			}, [props.block.props.transformMetadata]);

			const selectedMetric = React.useMemo(() => {
				return metrics.find((m) => m.id === metricId);
			}, [metricId, metrics]);

			// Fetch metric history when metric is selected
			useEffect(() => {
				if (
					!tenantName ||
					!metricId ||
					!startDate ||
					!endDate ||
					filters === undefined ||
					!currentNotebookId ||
					!metricName
				) {
					setHistoryData({
						prettyName: "",
						unit: null,
						transform: null,
						series: [],
					});
					return;
				}

				const fetchHistory = async () => {
					setLoading(true);
					try {
						const response = await Metrics.getHistory(
							tenantName,
							metricName,
							transform || null,
							transformMetadata,
							startDate,
							endDate,
							filters,
							groupBy,
							groupByFn,
							currentNotebookId,
						);
						setHistoryData(response);
					} catch (error) {
						console.error("Failed to fetch metric history:", error);
						setHistoryData({
							prettyName: "",
							unit: null,
							transform: null,
							series: [],
						});
					} finally {
						setLoading(false);
					}
				};

				void fetchHistory();
			}, [
				tenantName,
				metricId,
				metricName,
				transform,
				transformMetadata,
				startDate,
				endDate,
				filters,
				groupBy,
				groupByFn,
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

			const handleMetricSelect = (metric: Metric) => {
				props.editor.updateBlock(props.block, {
					props: {
						metricId: metric.id,
						metricName: metric.prometheusName,
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

			const handleGroupByFnChange = (grpByFn: GroupByFn) => {
				props.editor.updateBlock(props.block, {
					props: {
						groupByFn: grpByFn,
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

			// Render content based on state
			const renderContent = () => {
				if (!metricId) {
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

				if (!startDate || !endDate) {
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
									{historyData.prettyName}
								</h3>
							</div>
						</div>
						<MetricHistoryChart
							historyData={historyData}
							unit={historyData.unit}
							transform={transform || null}
							startDate={startDate}
							endDate={endDate}
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
								<MetricSelector
									metrics={metrics.filter((m) => m.type !== "increase")}
									blockFilters={blockFilters}
									selectedTransform={transform || null}
									selectedTransformMetadata={transformMetadata}
									selectedMetric={selectedMetric ?? null}
									selectedGroupBy={groupBy}
									selectedGroupByFn={groupByFn}
									onMetricSelect={handleMetricSelect}
									onGroupByChange={handleGroupByChange}
									onGroupByFnChange={handleGroupByFnChange}
									onFiltersChange={handleFiltersChange}
									onTransformChange={handleTransformChange}
								/>
							</div>
						</SheetContent>
					</Sheet>
				</>
			);
		},
	},
)();
