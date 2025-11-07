"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
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
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import type { Metric } from "@/src/types/metric";
import { MetricAggregationLabel } from "@/src/types/metric";
import { LabelBadge } from "@/components/LabelBadge";
import { Metrics, type MetricHistoryPoint } from "@/src/services/api/metrics";
import { useTenantStore } from "@/src/stores/tenant";
import { formatMetricValue } from "@/src/utils/metricFormatting";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

type MetricDetailDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	metric: Metric;
	labels: Record<string, string>;
};

export function MetricDetailDrawer({
	open,
	onOpenChange,
	metric,
	labels,
}: MetricDetailDrawerProps) {
	const [historyData, setHistoryData] = useState<MetricHistoryPoint[]>([]);
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
					labels,
					filters,
				);
				setHistoryData(response.data);
			} catch (error) {
				console.error("Failed to fetch metric history:", error);
			} finally {
				setLoading(false);
			}
		};

		void fetchHistory();
	}, [metric, open, currentTenant, labels, filters, timeWindow]);

	if (!metric) return null;

	// Calculate time window duration to determine appropriate date format
	const getTimeFormat = () => {
		if (historyData.length < 2) return "time";

		const duration =
			historyData[historyData.length - 1].timestamp.getTime() -
			historyData[0].timestamp.getTime();
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

	// Transform data for chart
	const chartData = historyData.map((point) => {
		const { formattedValue } = formatMetricValue(
			point.value,
			metric.unit || undefined,
			metric.aggregation,
		);
		// Parse back to number for chart (removes commas)
		const numericValue = Number.parseFloat(formattedValue.replace(/,/g, ""));

		let timestamp: string;
		if (timeFormat === "time") {
			timestamp = point.timestamp.toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			});
		} else if (timeFormat === "datetime") {
			timestamp = point.timestamp.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} else {
			timestamp = point.timestamp.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		}

		return {
			timestamp,
			value: numericValue,
		};
	});

	const chartConfig = {
		value: {
			label: metric.name,
			color: "var(--color-blue-300)",
		},
	} satisfies ChartConfig;

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
							<div className="text-2xl font-bold">{metric.name}</div>
							<div className="text-sm text-muted-foreground">
								{MetricAggregationLabel[metric.aggregation]}
							</div>
						</div>
						<DrawerClose asChild>
							<Button variant="ghost" size="icon">
								<X className="h-4 w-4" />
							</Button>
						</DrawerClose>
					</DrawerTitle>
					<DrawerDescription>
						<div className="flex gap-1 flex-wrap pt-2">
							{Object.entries(labels).map(([key, value]) => (
								<LabelBadge
									key={`${key}-${value}`}
									labelKey={key}
									labelValue={value}
									readonly
								/>
							))}
						</div>
					</DrawerDescription>
				</DrawerHeader>

				<div className="px-4 pb-4">
					{loading ? (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>Loading metric history...</p>
						</div>
					) : chartData.length > 0 ? (
						<ChartContainer config={chartConfig} className="h-[300px] w-full">
							<AreaChart data={chartData}>
								<defs>
									<linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="hsl(var(--chart-1))"
											stopOpacity={0.8}
										/>
										<stop
											offset="95%"
											stopColor="hsl(var(--chart-1))"
											stopOpacity={0.1}
										/>
									</linearGradient>
								</defs>
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
								<Area
									dataKey="value"
									type="monotone"
									fillOpacity={0.4}
									stroke="var(--color-blue-300))"
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					) : (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>No metric history data available</p>
						</div>
					)}
				</div>

				<DrawerFooter>
					<DrawerClose asChild>
						<Button variant="outline">Close</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
