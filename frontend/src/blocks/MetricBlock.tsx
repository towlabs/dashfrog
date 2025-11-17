"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { RectangleHorizontal, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LabelBadge } from "@/components/LabelBadge";
import { MetricSelector } from "@/components/MetricSelector";
import { EmptyState } from "@/components/EmptyState";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { Metrics } from "@/src/services/api/metrics";
import { useNotebooksStore } from "@/src/stores/notebooks";
import { useTenantStore } from "@/src/stores/tenant";
import { MetricAggregationLabel, type Metric } from "@/src/types/metric";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { formatMetricValue } from "@/src/utils/metricFormatting";

type AggregationFunction = "last" | "sum" | "avg";

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
			aggregation: {
				default: "last" as AggregationFunction,
			},
			healthMin: {
				default: "",
			},
			healthMax: {
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
			const metrics = useNotebooksStore((state) => state.metrics);
			const metricsLoading = useNotebooksStore((state) => state.metricsLoading);

			const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
			const [scalarData, setScalarData] = useState<
				{
					labels: Record<string, string>;
					value: number;
				}[]
			>([]);
			const [loading, setLoading] = useState(false);

			const metricName = props.block.props.metricName as string;
			const title = props.block.props.title as string;
			const aggregation = props.block.props.aggregation as AggregationFunction;
			const healthMin = props.block.props.healthMin as string;
			const healthMax = props.block.props.healthMax as string;

			// Update selected metric when metricName or available metrics change
			useEffect(() => {
				if (!metricName || metrics.length === 0) {
					setSelectedMetric(null);
					return;
				}

				const metric = metrics.find((m) => m.name === metricName);
				setSelectedMetric(metric || null);
			}, [metricName, metrics]);

			// Fetch scalar data when metric and aggregation are selected
			useEffect(() => {
				if (!tenantName || !selectedMetric || !aggregation) {
					setScalarData([]);
					return;
				}

				const fetchScalar = async () => {
					setLoading(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);
						const response = await Metrics.getScalars(
							tenantName,
							selectedMetric.prometheusName,
							selectedMetric.unit,
							start,
							end,
							filters,
							aggregation,
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
			}, [tenantName, selectedMetric, aggregation, timeWindow, filters]);

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

			const handleAggregationChange = (value: AggregationFunction) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						aggregation: value,
					},
				});
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

				if (metricsLoading || loading) {
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
							icon={RectangleHorizontal}
							title="Metric not found"
							description="The selected metric could not be loaded."
						/>
					);
				}

				if (scalarData.length === 0) {
					return (
						<EmptyState
							icon={RectangleHorizontal}
							title="No data available"
							description="No metric data found for the selected time period."
						/>
					);
				}

				return (
					<div className="outline-none flex flex-col gap-1">
						{scalarData.map((scalar, index) => renderScalarCard(scalar, index))}
					</div>
				);
			};

			const renderScalarCard = (
				scalar: { labels: Record<string, string>; value: number },
				index: number,
			) => {
				if (!selectedMetric) return null;

				const formatted = formatMetricValue(
					scalar.value,
					selectedMetric.unit ?? undefined,
					selectedMetric.aggregation,
				);

				const colorClass =
					healthMin || healthMax ? getHealthColor(scalar.value) : "";

				return (
					<Card key={index} className="@container/card shadow-none">
						<CardHeader>
							<CardDescription>
								{title ||
									`${MetricAggregationLabel[selectedMetric.aggregation]} Of ${selectedMetric.name}`}
							</CardDescription>
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
						<CardFooter className="flex-col items-start gap-1.5 text-sm p-3 pt-0">
							{Object.keys(scalar.labels).length > 0 && (
								<div className="flex gap-1 flex-wrap">
									{Object.entries(scalar.labels).map(([key, value]) => (
										<LabelBadge
											key={`${key}-${value}`}
											labelKey={key}
											labelValue={value}
											readonly
										/>
									))}
								</div>
							)}
						</CardFooter>
					</Card>
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
									<Label className="text-sm font-medium">Title</Label>
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
									<Label className="text-sm font-medium">Metric</Label>
									<MetricSelector
										metrics={metrics}
										metricsLoading={metricsLoading}
										selectedMetricName={metricName}
										onMetricSelect={handleMetricSelect}
									/>
								</div>

								<div className="space-y-3">
									<Label className="text-sm font-medium">Aggregation</Label>
									<Select
										value={aggregation}
										onValueChange={handleAggregationChange}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select aggregation..." />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="last">
												Last (Value at end of period)
											</SelectItem>
											<SelectItem value="sum">
												Sum (Sum across period)
											</SelectItem>
											<SelectItem value="avg">
												Average (Average across period)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-3">
									<Label className="text-sm font-medium">
										Health Interval (Optional)
									</Label>
									<div className="flex gap-2">
										<Input
											type="number"
											placeholder="Min"
											value={healthMin}
											onChange={(e) => {
												props.editor.updateBlock(props.block, {
													props: {
														...props.block.props,
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
														...props.block.props,
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
				</>
			);
		},
	},
)();
