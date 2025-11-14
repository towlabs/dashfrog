"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import {
	type MetricHistoryResponse,
	Metrics,
} from "@/src/services/api/metrics";
import { useTenantStore } from "@/src/stores/tenant";
import type { Metric } from "@/src/types/metric";
import { MetricAggregationLabel } from "@/src/types/metric";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { formatMetricValue } from "@/src/utils/metricFormatting";

type MetricDetailDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	metric: Metric;
};

export function MetricDetailDrawer({
	open,
	onOpenChange,
	metric,
}: MetricDetailDrawerProps) {
	const [historyData, setHistoryData] = useState<MetricHistoryResponse | null>(
		null,
	);
	const [loading, setLoading] = useState(false);
	const currentTenant = useTenantStore((state) => state.currentTenant);
	const timeWindow = useTenantStore((state) => state.timeWindow);
	const filters = useTenantStore((state) => state.filters);

	useEffect(() => {
		if (!open || !currentTenant) return;

		const fetchHistory = async () => {
			setLoading(true);
			try {
				const { start, end } = resolveTimeWindow(timeWindow);
				const response = await Metrics.getHistory(
					currentTenant,
					metric.name,
					metric.unit,
					start,
					end,
					filters,
				);
				setHistoryData(response);
			} catch (error) {
				console.error("Failed to fetch metric history:", error);
			} finally {
				setLoading(false);
			}
		};

		void fetchHistory();
	}, [metric, open, currentTenant, filters, timeWindow]);

	if (!metric) return null;

	// Get all unique timestamps across all series
	const allTimestamps = new Set<number>();
	if (historyData) {
		for (const series of historyData.series) {
			for (const point of series.data) {
				allTimestamps.add(point.timestamp.getTime());
			}
		}
	}
	const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

	// Calculate time window duration to determine appropriate date format
	const getTimeFormat = () => {
		if (sortedTimestamps.length < 2) return "time";

		const duration =
			sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0];
		const hours = duration / (1000 * 60 * 60);

		if (hours <= 1) {
			return "time"; // Show HH:MM
		}
		if (hours <= 24) {
			return "time"; // Show HH:MM
		}
		if (hours <= 168) {
			// Up to 7 days
			return "datetime"; // Show Mon HH:MM
		}
		return "date"; // Show Mon DD
	};

	const timeFormat = getTimeFormat();

	// Create a label for each series based on its labels
	const getSeriesLabel = (labels: Record<string, string>) => {
		return Object.entries(labels)
			.map(([key, value]) => `${key}=${value}`)
			.join(", ");
	};

	// Transform data for chart - merge all series by timestamp
	const chartData = sortedTimestamps.map((timestampMs) => {
		const timestamp = new Date(timestampMs);
		let timestampStr: string;
		if (timeFormat === "time") {
			timestampStr = timestamp.toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			});
		} else if (timeFormat === "datetime") {
			timestampStr = timestamp.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} else {
			timestampStr = timestamp.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		}

		const dataPoint: Record<string, string | number> = {
			timestamp: timestampStr,
		};

		// Add value for each series at this timestamp
		if (historyData) {
			for (let i = 0; i < historyData.series.length; i++) {
				const series = historyData.series[i];
				const seriesLabel = getSeriesLabel(series.labels);
				const point = series.data.find(
					(p) => p.timestamp.getTime() === timestampMs,
				);
				if (point) {
					const { formattedValue } = formatMetricValue(
						point.value,
						metric.unit ?? undefined,
						metric.aggregation,
					);
					// Parse back to number for chart (removes commas)
					dataPoint[seriesLabel] = Number.parseFloat(
						formattedValue.replace(/,/g, ""),
					);
				}
			}
		}

		return dataPoint;
	});

	// Build chart config for all series
	const chartConfig: ChartConfig = {};
	const chartColors = [
		"var(--color-blue-300)",
		"var(--color-blue-500)",
		"var(--color-blue-700)",
		"var(--color-blue-800)",
		"var(--color-blue-900)",
	];

	if (historyData) {
		for (let i = 0; i < historyData.series.length; i++) {
			const series = historyData.series[i];
			const seriesLabel = getSeriesLabel(series.labels);
			chartConfig[seriesLabel] = {
				label: seriesLabel,
				color: chartColors[i % chartColors.length],
			};
		}
	}

	const { displayUnit } = formatMetricValue(
		0,
		metric.unit || undefined,
		metric.aggregation,
	);

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle className="flex items-center justify-between">
						<div className="space-y-2">
							<div className="text-2xl font-bold">
								{MetricAggregationLabel[metric.aggregation]} Of {metric.name}
							</div>
						</div>
						<DrawerClose asChild>
							<Button variant="ghost" size="icon">
								<X className="h-4 w-4" />
							</Button>
						</DrawerClose>
					</DrawerTitle>
				</DrawerHeader>

				<div className="px-4 pb-10">
					{loading ? (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>Loading metric history...</p>
						</div>
					) : chartData.length > 0 ? (
						<ChartContainer config={chartConfig} className="h-[400px] w-full">
							<LineChart data={chartData}>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="timestamp"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									minTickGap={32}
									tickFormatter={(value) => value}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									width={80}
									tickFormatter={(value) =>
										`${value.toLocaleString()}${displayUnit ? ` ${displayUnit}` : ""}`
									}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											labelFormatter={(value) => `Time: ${value}`}
											formatter={(value) =>
												`${value}${displayUnit ? ` ${displayUnit}` : ""}`
											}
										/>
									}
								/>
								<ChartLegend content={<ChartLegendContent />} />
								{historyData?.series.map((series, i) => {
									const seriesLabel = getSeriesLabel(series.labels);
									return (
										<Line
											key={seriesLabel}
											dataKey={seriesLabel}
											type="monotone"
											stroke={chartColors[i % chartColors.length]}
											strokeWidth={2}
											dot={false}
										/>
									);
								})}
							</LineChart>
						</ChartContainer>
					) : (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>No metric history data available</p>
						</div>
					)}
				</div>
			</DrawerContent>
		</Drawer>
	);
}
