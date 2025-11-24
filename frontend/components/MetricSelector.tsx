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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
	RangeAggregation,
	InstantAggregation,
	RangeMetric,
	InstantMetric,
	Show,
} from "@/src/types/metric";
import { FilterBadgesEditor } from "./FilterBadgesEditor";
import { useLabelsStore } from "@/src/stores/labels";
import { Filter } from "@/src/types/filter";

type RangeMetricSelectorProps = {
	metrics: RangeMetric[];
	metricsLoading: boolean;
	selectedMetric: RangeMetric | null;
	onMetricSelect: (metric: RangeMetric) => void;
};

export function RangeMetricSelector({
	metrics,
	metricsLoading,
	selectedMetric,
	onMetricSelect,
}: RangeMetricSelectorProps) {
	const [comboboxOpen, setComboboxOpen] = useState(false);

	if (metricsLoading && metrics.length === 0) {
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
	const groupedMetrics: Record<string, RangeMetric[]> = {};
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
					{selectedMetric ? selectedMetric.prettyName : "Select a metric..."}
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
												selectedMetric?.prometheusName ===
													metric.prometheusName &&
													selectedMetric?.aggregation === metric.aggregation
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

type InstantMetricSelectorProps = {
	metrics: InstantMetric[];
	selectedMetric: InstantMetric | null;
	selectedShow: Show | null;
	blockFilters: Filter[];
	onMetricSelect: (metric: InstantMetric, show: Show) => void;
	onFiltersChange: (filters: Filter[]) => void;
};

export function InstantMetricSelector({
	metrics,
	selectedMetric,
	selectedShow,
	blockFilters,
	onMetricSelect,
	onFiltersChange,
}: InstantMetricSelectorProps) {
	const labels = useLabelsStore((state) => state.labels);
	const [comboboxOpen, setComboboxOpen] = useState(false);

	if (metrics.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">No metrics available</div>
		);
	}

	// Group metrics by aggregation type
	const groupedMetrics: Record<string, InstantMetric[]> = {};
	for (const metric of metrics) {
		const groupKey = getAggregationGroupKey(metric.aggregation);
		if (!groupedMetrics[groupKey]) {
			groupedMetrics[groupKey] = [];
		}
		groupedMetrics[groupKey].push(metric);
	}

	const showMultipleOptions = selectedMetric && selectedMetric.show.length > 1;

	return (
		<div className="space-y-2">
			<Popover open={comboboxOpen} onOpenChange={setComboboxOpen} modal={true}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={comboboxOpen}
						className="w-full justify-between"
					>
						{selectedMetric ? selectedMetric.prettyName : "Select a metric..."}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[400px] p-0">
					<Command>
						<CommandInput placeholder="Search metrics..." />
						<CommandList>
							<CommandEmpty>No metric found.</CommandEmpty>
							{Object.entries(groupedMetrics).map(
								([groupKey, groupMetrics]) => (
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
													const defaultShow =
														metric.show.length > 0 ? metric.show[0] : "last";
													onMetricSelect(metric, defaultShow);
													setComboboxOpen(false);
												}}
												className="flex items-center justify-between"
											>
												<span>{metric.prettyName}</span>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														selectedMetric?.prometheusName ===
															metric.prometheusName &&
															selectedMetric?.aggregation === metric.aggregation
															? "opacity-100"
															: "opacity-0",
													)}
												/>
											</CommandItem>
										))}
									</CommandGroup>
								),
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{showMultipleOptions && (
				<div className="space-y-2">
					<div className="flex items-center gap-1.5">
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Aggregation
						</h3>
						<TooltipProvider delayDuration={300}>
							<Tooltip>
								<TooltipTrigger asChild>
									<HelpCircle className="size-3 text-muted-foreground cursor-help" />
								</TooltipTrigger>
								<TooltipContent side="right">
									<p className="max-w-xs text-sm">
										How to aggregate the metric values over the selected time
										window
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<TooltipProvider delayDuration={300}>
						<Select
							value={selectedShow || selectedMetric.show[0]}
							onValueChange={(value: Show) => {
								onMetricSelect(selectedMetric, value);
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{selectedMetric.show.includes("last") && (
									<Tooltip>
										<TooltipTrigger asChild>
											<SelectItem value="last">Last value</SelectItem>
										</TooltipTrigger>
										<TooltipContent side="right">
											<p className="max-w-xs text-sm">
												Returns the most recent value in the time window
											</p>
										</TooltipContent>
									</Tooltip>
								)}
								{selectedMetric.show.includes("avg") && (
									<Tooltip>
										<TooltipTrigger asChild>
											<SelectItem value="avg">Average over time</SelectItem>
										</TooltipTrigger>
										<TooltipContent side="right">
											<p className="max-w-xs text-sm">
												Calculates the mean of all values in the time window
											</p>
										</TooltipContent>
									</Tooltip>
								)}
								{selectedMetric.show.includes("min") && (
									<Tooltip>
										<TooltipTrigger asChild>
											<SelectItem value="min">Minimum over time</SelectItem>
										</TooltipTrigger>
										<TooltipContent side="right">
											<p className="max-w-xs text-sm">
												Returns the lowest value in the time window
											</p>
										</TooltipContent>
									</Tooltip>
								)}
								{selectedMetric.show.includes("max") && (
									<Tooltip>
										<TooltipTrigger asChild>
											<SelectItem value="max">Maximum over time</SelectItem>
										</TooltipTrigger>
										<TooltipContent side="right">
											<p className="max-w-xs text-sm">
												Returns the highest value in the time window
											</p>
										</TooltipContent>
									</Tooltip>
								)}
							</SelectContent>
						</Select>
					</TooltipProvider>
				</div>
			)}

			<div className="space-y-2">
				<div className="flex gap-2 flex-col">
					<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Additional Filters
					</h3>

					<FilterBadgesEditor
						availableLabels={labels}
						filters={blockFilters}
						onFiltersChange={onFiltersChange}
					/>
				</div>
			</div>
		</div>
	);
}

// Helper functions for grouping
function getAggregationGroupKey(
	aggregation: RangeAggregation | InstantAggregation,
): string {
	if (aggregation === "increase") return "increase";
	if (aggregation.startsWith("rate")) return "rate";
	if (aggregation.startsWith("p")) return "percentile";
	return "other";
}

function getAggregationGroupLabel(groupKey: string): string {
	switch (groupKey) {
		case "increase":
			return "Total";
		case "rate":
			return "Rates";
		case "percentile":
			return "Percentiles";
		default:
			return "Other";
	}
}

function getAggregationGroupDescription(groupKey: string): string {
	switch (groupKey) {
		case "increase":
			return "Shows the total increase of a counter metric over the selected time window. For example: number of new users, number of cancelled orders, etc.";
		case "rate":
			return "Shows the rate of change per time unit (second, minute, hour, or day). For example: number of requests per second, number of errors per minute, etc.";
		case "percentile":
			return "Shows the value below which a given percentage of observations fall (p50 = median, p99 = 99th percentile). For example: 90th percentile of response time, 95th percentile of request duration, etc.";
		default:
			return "";
	}
}
