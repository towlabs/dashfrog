"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import type { MetricHistoryResponse } from "@/src/services/api/metrics";
import type { Metric } from "@/src/types/metric";
import { formatMetricValue } from "@/src/utils/metricFormatting";

type MetricHistoryChartProps = {
	historyData: MetricHistoryResponse;
	metric: Metric;
};

export function MetricHistoryChart({
	historyData,
	metric,
}: MetricHistoryChartProps) {
	// Get all unique timestamps across all series
	const allTimestamps = new Set<number>();
	for (const series of historyData.series) {
		for (const point of series.data) {
			allTimestamps.add(point.timestamp.getTime());
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

	for (let i = 0; i < historyData.series.length; i++) {
		const series = historyData.series[i];
		const seriesLabel = getSeriesLabel(series.labels);
		chartConfig[seriesLabel] = {
			label: seriesLabel,
			color: chartColors[i % chartColors.length],
		};
	}

	const { displayUnit } = formatMetricValue(
		0,
		metric.unit ?? undefined,
		metric.aggregation,
	);

	return (
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
				{historyData.series.map((series, i) => {
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
	);
}
