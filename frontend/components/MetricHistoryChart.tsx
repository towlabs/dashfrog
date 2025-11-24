/** biome-ignore-all lint/suspicious/noExplicitAny: some anys here are from recharts */
"use client";

import { useCallback, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartTooltip,
} from "@/components/ui/chart";
import type {
	MetricHistory,
	RangeAggregation,
	RangeMetric,
} from "@/src/types/metric";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";
import { formatMetricValue } from "@/src/utils/metricFormatting";
import React from "react";

type MetricHistoryChartProps = {
	historyData: {
		series: { labels: Record<string, string>; values: MetricHistory[] }[];
	};
	metric: RangeMetric | null;
	startDate: Date;
	endDate: Date;
};

export function MetricHistoryChart({
	historyData,
	metric,
	startDate,
	endDate,
}: MetricHistoryChartProps) {
	// Track which series are visible
	const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
	const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

	// Get all unique timestamps across all series that have data
	const dataTimestamps = new Set<number>();
	for (const series of historyData.series) {
		for (const point of series.values) {
			dataTimestamps.add(point.timestamp.getTime());
		}
	}

	// // Build timestamps array starting with window boundaries
	// const timestamps = [windowStart.getTime(), windowEnd.getTime()];

	// // Add all data timestamps that fall within the window
	// for (const timestamp of dataTimestamps) {
	// 	if (timestamp >= windowStart.getTime() && timestamp <= windowEnd.getTime()) {
	// 		timestamps.push(timestamp);
	// 	}
	// }

	// // Sort and remove duplicates
	// const sortedTimestamps = Array.from(new Set(timestamps)).sort((a, b) => a - b);

	// Get all unique timestamps across all series
	const allTimestamps = new Set<number>();
	for (const series of historyData.series) {
		for (const point of series.values) {
			allTimestamps.add(point.timestamp.getTime());
		}
	}
	const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

	// Calculate time window duration to determine appropriate date format
	const getTimeFormat = () => {
		const duration = endDate.getTime() - startDate.getTime();
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
	const getSeriesLabel = useCallback((labels: Record<string, string>) => {
		return Object.entries(labels)
			.map(([key, value]) => `${key}=${value}`)
			.join(", ");
	}, []);

	// Handle legend click - Grafana style
	const handleLegendClick = useCallback(
		(seriesLabel: string, event: React.MouseEvent) => {
			const allSeriesLabels = historyData.series.map((s) =>
				getSeriesLabel(s.labels),
			);

			if (event.metaKey || event.ctrlKey) {
				// Cmd/Ctrl + Click: Toggle only this series (hide all others or show all)
				setHiddenSeries((prev) => {
					const onlyThisHidden =
						prev.size === allSeriesLabels.length - 1 && !prev.has(seriesLabel);

					if (onlyThisHidden) {
						// If only this series is showing, show all
						return new Set();
					}
					// Hide all except this one
					const newHidden = new Set(allSeriesLabels);
					newHidden.delete(seriesLabel);
					return newHidden;
				});
			} else {
				// Regular click: Toggle this series
				setHiddenSeries((prev) => {
					const next = new Set(prev);
					if (next.has(seriesLabel)) {
						next.delete(seriesLabel);
					} else {
						next.add(seriesLabel);
					}
					return next;
				});
			}
		},
		[historyData.series, getSeriesLabel],
	);

	// Transform data for chart - merge all series by timestamp
	const chartData = React.useMemo(
		() =>
			sortedTimestamps.map((timestampMs) => {
				if (!metric) return [];
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
					const point = series.values.find(
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
			}),
		[historyData.series, metric, timeFormat, sortedTimestamps, getSeriesLabel],
	);

	// Build chart config for all series
	const chartConfig: ChartConfig = {};
	const chartColors = [
		"var(--color-chart-1)",
		"var(--color-chart-2)",
		"var(--color-chart-3)",
		"var(--color-chart-4)",
		"var(--color-chart-5)",
	];

	for (let i = 0; i < historyData.series.length; i++) {
		const series = historyData.series[i];
		const seriesLabel = getSeriesLabel(series.labels);
		chartConfig[seriesLabel] = {
			label: seriesLabel,
			color: chartColors[i % chartColors.length],
		};
	}

	const { displayUnit } = React.useMemo(() => {
		if (!metric) return { displayUnit: undefined };
		return formatMetricValue(0, metric.unit ?? undefined, metric.aggregation);
	}, [metric]);

	// Custom tooltip component with colored squares
	const CustomTooltip = useMemo(() => {
		return ({ active, payload, label }: any) => {
			if (!active || !payload?.length) return null;

			return (
				<div className="rounded-lg border bg-background p-2 shadow-sm">
					<div className="mb-1 font-bold text-sm">{label}</div>
					<div className="flex flex-col gap-1">
						{payload
							.filter((item: any) => !hiddenSeries.has(item.dataKey))
							.map((item: any) => (
								<div key={item.dataKey} className="flex items-center gap-2">
									<div
										className="h-2 w-2 shrink-0 rounded-[2px]"
										style={{ backgroundColor: item.color }}
									/>
									<span className="text-sm">
										<span className="font-medium">
											{item.value}
											{displayUnit ? ` ${displayUnit}` : ""}
										</span>
									</span>
								</div>
							))}
					</div>
				</div>
			);
		};
	}, [hiddenSeries, displayUnit]);

	// Custom legend component with click handling
	const CustomLegend = useMemo(() => {
		return ({ payload }: { payload?: any[] }) => {
			if (!payload?.length) return null;

			return (
				<div className="flex items-center justify-center gap-4 pt-3 flex-wrap">
					{payload
						.filter((item) => item.type !== "none")
						.map((item) => {
							const seriesLabel = item.dataKey;
							const isHidden = hiddenSeries.has(seriesLabel);

							return (
								<div
									key={item.value}
									className="flex items-center gap-1.5 cursor-pointer select-none hover:opacity-80 transition-opacity"
									onClick={(e) => handleLegendClick(seriesLabel, e)}
									onMouseEnter={() => setHoveredSeries(seriesLabel)}
									onMouseLeave={() => setHoveredSeries(null)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											handleLegendClick(seriesLabel, e as any);
										}
									}}
									role="button"
									tabIndex={0}
									title={`Click to toggle, ${typeof window !== "undefined" && window.navigator.userAgent.includes("Mac") ? "Cmd" : "Ctrl"}+Click to isolate`}
								>
									<div
										className="h-2 w-2 shrink-0 rounded-[2px]"
										style={{
											backgroundColor: item.color,
											opacity: isHidden ? 0.3 : 1,
										}}
									/>
									<span
										style={{
											opacity: isHidden ? 0.5 : 1,
											textDecoration: isHidden ? "line-through" : "none",
										}}
									>
										{item.value}
									</span>
								</div>
							);
						})}
				</div>
			);
		};
	}, [hiddenSeries, handleLegendClick]);

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
					tick={{
						style: {
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						},
					}}
				/>
				<ChartTooltip content={<CustomTooltip />} />
				<ChartLegend content={<CustomLegend />} />
				{historyData.series.map((series, i) => {
					const seriesLabel = getSeriesLabel(series.labels);
					const isHidden = hiddenSeries.has(seriesLabel);
					const isHovered = hoveredSeries === seriesLabel;
					const shouldDim = hoveredSeries !== null && !isHovered;

					return (
						<Line
							key={seriesLabel}
							dataKey={seriesLabel}
							type="monotone"
							stroke={chartColors[i % chartColors.length]}
							strokeWidth={isHovered ? 3 : 2}
							dot={false}
							hide={isHidden}
							strokeOpacity={isHidden ? 0 : shouldDim ? 0.2 : 1}
						/>
					);
				})}
			</LineChart>
		</ChartContainer>
	);
}
