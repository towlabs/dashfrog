"use client";

import { Check, ChevronsUpDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Metric, MetricAggregation } from "@/src/types/metric";

type MetricSelectorProps = {
	metrics: Metric[];
	metricsLoading: boolean;
	selectedMetricName: string;
	selectedSpatialAggregation: MetricAggregation | "";
	onMetricSelect: (metric: Metric) => void;
};

export function MetricSelector({
	metrics,
	metricsLoading,
	selectedMetricName,
	selectedSpatialAggregation,
	onMetricSelect,
}: MetricSelectorProps) {
	const [comboboxOpen, setComboboxOpen] = useState(false);

	if (metricsLoading) {
		return (
			<div className="text-sm text-muted-foreground">Loading metrics...</div>
		);
	}

	if (metrics.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">No metrics available</div>
		);
	}

	// Group metrics by aggregation type
	const groupedMetrics: Record<string, Metric[]> = {};
	for (const metric of metrics) {
		const groupKey = getAggregationGroupKey(metric.aggregation);
		if (!groupedMetrics[groupKey]) {
			groupedMetrics[groupKey] = [];
		}
		groupedMetrics[groupKey].push(metric);
	}

	return (
		<Popover open={comboboxOpen} onOpenChange={setComboboxOpen} modal={true}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={comboboxOpen}
					className="w-full justify-between"
				>
					{selectedMetricName
						? (() => {
								const metric = metrics.find(
									(m) =>
										m.prometheusName === selectedMetricName &&
										m.aggregation === selectedSpatialAggregation,
								);
								return metric ? metric.prettyName : "Select a metric...";
							})()
						: "Select a metric..."}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[400px] p-0">
				<Command>
					<CommandInput placeholder="Search metrics..." />
					<CommandList>
						<CommandEmpty>No metric found.</CommandEmpty>
						{Object.entries(groupedMetrics).map(([groupKey, groupMetrics]) => (
							<CommandGroup
								key={groupKey}
								heading={
									<div className="flex items-center gap-1.5">
										<span>{getAggregationGroupLabel(groupKey)}</span>
										<TooltipProvider delayDuration={300}>
											<Tooltip>
												<TooltipTrigger asChild>
													<HelpCircle className="size-3 text-muted-foreground" />
												</TooltipTrigger>
												<TooltipContent side="right">
													<p className="max-w-xs text-sm">
														{getAggregationGroupDescription(groupKey)}
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
								}
							>
								{groupMetrics.map((metric) => (
									<CommandItem
										key={`${metric.prometheusName}-${metric.aggregation}`}
										value={metric.prettyName}
										onSelect={() => {
											onMetricSelect(metric);
											setComboboxOpen(false);
										}}
										className="flex items-center justify-between"
									>
										<span>{metric.prettyName}</span>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												selectedMetricName === metric.prometheusName &&
													selectedSpatialAggregation === metric.aggregation
													? "opacity-100"
													: "opacity-0",
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

// Helper functions for grouping
function getAggregationGroupKey(aggregation: MetricAggregation): string {
	if (aggregation === "increase") return "increase";
	if (aggregation.startsWith("rate")) return "rate";
	if (aggregation.startsWith("p")) return "percentile";
	return "other";
}

function getAggregationGroupLabel(groupKey: string): string {
	switch (groupKey) {
		case "increase":
			return "Increase";
		case "rate":
			return "Rate";
		case "percentile":
			return "Percentiles";
		default:
			return "Other";
	}
}

function getAggregationGroupDescription(groupKey: string): string {
	switch (groupKey) {
		case "increase":
			return "Shows the total increase of a counter metric over the selected time window. For exmple: number of new users, number of cancelled orders, etc.";
		case "rate":
			return "Shows the rate of change per time unit (second, minute, hour, or day). For example: number of requests per second, number of errors per minute, etc.";
		case "percentile":
			return "Shows the value below which a given percentage of observations fall (p50 = median, p99 = 99th percentile). For example: 90th percentile of response time, 95th percentile of request duration, etc.";
		default:
			return "";
	}
}
