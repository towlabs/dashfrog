"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
	BarChart3,
	CaseUpper,
	ChartLine,
	Eye,
	EyeOff,
	Hash,
	Table as TableIcon,
	Tags,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { LabelBadge } from "@/components/LabelBadge";
import { MetricDetailDrawer } from "@/components/MetricDetailDrawer";
import { InstantMetricSelector } from "@/components/MetricSelector";
import { Input } from "@/components/ui/input";
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
import { Metrics } from "@/src/services/api/metrics";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import type { InstantMetric, Show } from "@/src/types/metric";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { formatMetricValue } from "@/src/utils/metricFormatting";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export const MetricTableBlock = createReactBlockSpec(
	{
		type: "metricTable" as const,
		propSchema: {
			metricName: {
				default: "",
			},
			title: {
				default: "",
			},
			aggregation: {
				default: "",
			},
			show: {
				default: "last" as Show,
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
			const instantMetrics = useNotebooksStore((state) => state.instantMetrics);
			const rangeMetrics = useNotebooksStore((state) => state.rangeMetrics);
			const metricsLoading = useNotebooksStore((state) => state.metricsLoading);
			const startDate = useNotebooksStore((state) => state.startDate);
			const endDate = useNotebooksStore((state) => state.endDate);
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
			const aggregation = props.block.props.aggregation as string;
			const show = props.block.props.show as Show;
			const showMetricColumn = props.block.props.showMetricColumn as boolean;
			const showLabelsColumn = props.block.props.showLabelsColumn as boolean;
			const showValueColumn = props.block.props.showValueColumn as boolean;

			const selectedMetric = React.useMemo(() => {
				return instantMetrics.find(
					(m) =>
						m.prometheusName === metricName && m.aggregation === aggregation,
				);
			}, [metricName, aggregation, instantMetrics]);

			const rangeMetric = React.useMemo(() => {
				if (!selectedMetric) return null;
				return rangeMetrics.find(
					(m) =>
						m.aggregation === selectedMetric.rangeAggregation &&
						m.prometheusName === selectedMetric.prometheusName,
				);
			}, [selectedMetric, rangeMetrics]);

			// Fetch scalar data when metric and aggregation are selected
			useEffect(() => {
				if (
					!tenantName ||
					!selectedMetric ||
					!startDate ||
					!endDate ||
					filters === undefined
				) {
					setScalarData([]);
					return;
				}

				const fetchScalar = async () => {
					setLoading(true);
					try {
						const response = await Metrics.getScalars(
							tenantName,
							selectedMetric.prometheusName,
							startDate,
							endDate,
							selectedMetric.aggregation,
							show,
							filters,
						);
						setScalarData(response.scalars);
					} catch (error) {
						console.error("Failed to fetch metric scalar:", error);
						setScalarData([]);
					} finally {
						setLoading(false);
					}
				};

				void fetchScalar();
			}, [tenantName, selectedMetric, show, startDate, endDate, filters]);

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

			const handleMetricSelect = (metric: InstantMetric, newShow: Show) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						metricName: metric.prometheusName,
						aggregation: metric.aggregation,
						show: newShow,
					},
				});
			};

			const handleMetricClick = (labels: Record<string, string>) => {
				setSelectedLabels(labels);
				setDetailOpen(true);
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

				if (loading && scalarData === null) {
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

				if (scalarData?.length === 0) {
					return (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>No data available</p>
						</div>
					);
				}

				return (
					<div className="space-y-4">
						<Table className="table-fixed">
							<TableHeader>
								<TableRow>
									{showMetricColumn && (
										<TableHead className="w-48">
											<div className="flex items-center gap-2">
												<CaseUpper strokeWidth={2.5} className="size-4" />{" "}
												Metric
											</div>
										</TableHead>
									)}
									{showLabelsColumn && (
										<TableHead className="w-auto">
											<div className="flex items-center gap-2">
												<Tags strokeWidth={2.5} className="size-4" /> Labels
											</div>
										</TableHead>
									)}
									{showValueColumn && (
										<TableHead className="w-32">
											<div className="flex items-center gap-2">
												<Hash strokeWidth={2.5} className="size-4" /> Value
											</div>
										</TableHead>
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{(scalarData || []).map((scalar, idx) => {
									const { formattedValue, displayUnit } = formatMetricValue(
										scalar.value,
										selectedMetric.unit ?? undefined,
										selectedMetric.aggregation,
									);
									return (
										<TableRow key={idx} className="group">
											{showMetricColumn && (
												<TableCell className="group-hover:opacity-100 transition-opacity">
													<div className="relative flex items-center">
														<span className="font-medium">
															{title || selectedMetric.prettyName}
														</span>
														<Tooltip>
															<TooltipTrigger asChild>
																<div
																	className="absolute -right-3 -top-2 px-2 py-1.5 rounded-b-lg border border-t-0 bg-background group-hover:opacity-100 transition-opacity cursor-pointer z-10 flex items-center gap-1 opacity-0 shadow-xs "
																	onClick={() =>
																		handleMetricClick(scalar.labels)
																	}
																>
																	<ChartLine className="size-3.5 text-muted-foreground" />
																	<span className="text-xs text-muted-foreground">
																		History
																	</span>
																</div>
															</TooltipTrigger>
															<TooltipContent>
																<p>View metric history</p>
															</TooltipContent>
														</Tooltip>
													</div>
												</TableCell>
											)}
											{showLabelsColumn && (
												<TableCell>
													<div className="flex flex-wrap gap-1">
														{Object.entries(scalar.labels).map(
															([key, value]) => (
																<LabelBadge
																	key={`${key}-${value}`}
																	labelKey={key}
																	labelValue={value}
																	readonly
																/>
															),
														)}
													</div>
												</TableCell>
											)}
											{showValueColumn && (
												<TableCell>
													<div className="flex items-center gap-2">
														<span>
															{formattedValue}
															{displayUnit && ` ${displayUnit}`}
														</span>
													</div>
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

								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Metric
									</h3>
									<InstantMetricSelector
										metrics={instantMetrics}
										selectedMetric={selectedMetric ?? null}
										selectedShow={show}
										onMetricSelect={handleMetricSelect}
									/>
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
