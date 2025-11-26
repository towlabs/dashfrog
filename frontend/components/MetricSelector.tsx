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
import { Input } from "@/components/ui/input";
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
import { useLabelsStore } from "@/src/stores/labels";
import type { Filter } from "@/src/types/filter";
import type {
	GroupByFn,
	InstantMetric,
	MetricType,
	RangeMetric,
	TimeAggregation,
	Transform,
} from "@/src/types/metric";
import { FilterBadgesEditor } from "./FilterBadgesEditor";

type RangeMetricSelectorProps = {
	metrics: RangeMetric[];
	metricsLoading: boolean;
	selectedMetric: RangeMetric | null;
	selectedGroupBy: string[];
	selectedGroupByFn: GroupByFn | null;
	onMetricSelect: (metric: RangeMetric) => void;
	onGroupByChange: (labels: string[]) => void;
	onGroupByFnChange: (groupByFn: GroupByFn) => void;
};

export function RangeMetricSelector({
	metrics,
	metricsLoading,
	selectedMetric,
	selectedGroupBy,
	selectedGroupByFn,
	onMetricSelect,
	onGroupByChange,
	onGroupByFnChange,
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

	// Group metrics by transform type
	const groupedMetrics: Record<string, RangeMetric[]> = {};
	for (const metric of metrics) {
		const groupKey = getAggregationGroupKey(metric.transform, metric.type);
		if (!groupedMetrics[groupKey]) {
			groupedMetrics[groupKey] = [];
		}
		groupedMetrics[groupKey].push(metric);
	}

	const hasMultipleGroupByFnOptions =
		selectedMetric && selectedMetric.groupBy.length > 1;

	return (
		<div className="space-y-2">
			<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				Metric
			</h3>
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
												key={`${metric.prometheusName}-${metric.transform}`}
												value={metric.prettyName}
												onSelect={() => {
													onMetricSelect(metric);
													// Set default groupByFn if not already set
													if (!selectedGroupByFn && metric.groupBy.length > 0) {
														onGroupByFnChange(metric.groupBy[0]);
													}
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
															selectedMetric?.transform === metric.transform
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

			{selectedMetric && (
				<>
					<div className="space-y-2 flex-1">
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Group By
						</h3>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-start text-left"
								>
									{selectedGroupBy.length > 0 ? (
										<span>{selectedGroupBy.join(", ")}</span>
									) : (
										<span className="text-muted-foreground">
											Select labels to group by...
										</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[300px] p-0" align="start">
								<Command>
									<CommandInput placeholder="Search labels..." />
									<CommandList>
										<CommandEmpty>No labels found.</CommandEmpty>
										<CommandGroup heading="Available Labels">
											{selectedMetric.labels.map((label) => (
												<CommandItem
													key={label}
													value={label}
													onSelect={() => {
														const newGroupBy = selectedGroupBy.includes(label)
															? selectedGroupBy.filter((l) => l !== label)
															: [...selectedGroupBy, label];
														onGroupByChange(newGroupBy);
													}}
												>
													<Check
														className={cn(
															"mr-2 h-4 w-4",
															selectedGroupBy.includes(label)
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													{label}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
					{hasMultipleGroupByFnOptions && (
						<div className="space-y-2">
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
								Group Function
							</h3>
							<Select
								value={selectedGroupByFn || selectedMetric.groupBy[0]}
								onValueChange={onGroupByFnChange}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{selectedMetric.groupBy.includes("sum") && (
										<SelectItem value="sum">Sum</SelectItem>
									)}
									{selectedMetric.groupBy.includes("avg") && (
										<SelectItem value="avg">Average</SelectItem>
									)}
									{selectedMetric.groupBy.includes("min") && (
										<SelectItem value="min">Min</SelectItem>
									)}
									{selectedMetric.groupBy.includes("max") && (
										<SelectItem value="max">Max</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>
					)}
				</>
			)}
		</div>
	);
}

type InstantMetricSelectorProps = {
	metrics: InstantMetric[];
	selectedMetric: InstantMetric | null;
	selectedTimeAggregation: TimeAggregation | null;
	selectedGroupBy: string[];
	selectedGroupByFn: GroupByFn | null;
	blockFilters: Filter[];
	matchOperator?: "==" | ">" | "<" | ">=" | "<=" | "!=";
	matchValue?: string;
	onMetricSelect: (metric: InstantMetric) => void;
	onTimeAggregationChange: (timeAggregation: TimeAggregation) => void;
	onGroupByChange: (labels: string[]) => void;
	onGroupByFnChange: (groupByFn: GroupByFn) => void;
	onFiltersChange: (filters: Filter[]) => void;
	onMatchConditionChange?: (
		operator: "==" | ">" | "<" | ">=" | "<=" | "!=",
		value: string,
	) => void;
	disableGroupBy?: boolean;
};

export function InstantMetricSelector({
	metrics,
	selectedMetric,
	selectedTimeAggregation,
	selectedGroupBy,
	selectedGroupByFn,
	blockFilters,
	matchOperator = "==",
	matchValue = "",
	onMetricSelect,
	onTimeAggregationChange,
	onGroupByChange,
	onGroupByFnChange,
	onFiltersChange,
	onMatchConditionChange,
	disableGroupBy = false,
}: InstantMetricSelectorProps) {
	const labels = useLabelsStore((state) => state.labels);
	const [comboboxOpen, setComboboxOpen] = useState(false);

	if (metrics.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">No metrics available</div>
		);
	}

	// Group metrics by transform type
	const groupedMetrics: Record<string, InstantMetric[]> = {};
	for (const metric of metrics) {
		const groupKey = getAggregationGroupKey(metric.transform, metric.type);
		if (!groupedMetrics[groupKey]) {
			groupedMetrics[groupKey] = [];
		}
		groupedMetrics[groupKey].push(metric);
	}

	const hasMultipleTimeAggregations =
		selectedMetric && selectedMetric.timeAggregation.length > 1;
	const hasMultipleGroupByFnOptions =
		selectedMetric && selectedMetric.groupBy.length > 1;

	return (
		<div className="space-y-2">
			<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				Metric
			</h3>
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
												key={`${metric.prometheusName}-${metric.transform}`}
												value={metric.prettyName}
												onSelect={() => {
													onMetricSelect(metric);
													// Set default timeAggregation if not already set
													if (
														!selectedTimeAggregation ||
														!metric.timeAggregation.includes(
															selectedTimeAggregation,
														)
													) {
														onTimeAggregationChange(metric.timeAggregation[0]);
													}
													// Set default groupBy if not already set
													if (
														!selectedGroupByFn ||
														!metric.groupBy.includes(selectedGroupByFn)
													) {
														onGroupByFnChange(metric.groupBy[0]);
													}
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
															selectedMetric?.transform === metric.transform
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

			{selectedMetric && (
				<>
					<div className="flex gap-2">
						{!disableGroupBy && (
							<div className="space-y-2 flex-1">
								<div className="flex items-center gap-1.5">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Group By
									</h3>
									<TooltipProvider delayDuration={300}>
										<Tooltip>
											<TooltipTrigger asChild>
												<HelpCircle className="size-3 text-muted-foreground cursor-help" />
											</TooltipTrigger>
											<TooltipContent side="right">
												<p className="max-w-xs text-sm">
													Labels to group by. If no labels are selected, all
													values will be combined into a single one.
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full justify-start text-left"
										>
											{selectedGroupBy.length > 0 ? (
												<span>{selectedGroupBy.join(", ")}</span>
											) : (
												<span className="text-muted-foreground">
													Select labels to group by...
												</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-[300px] p-0" align="start">
										<Command>
											<CommandInput placeholder="Search labels..." />
											<CommandList>
												<CommandEmpty>No labels found.</CommandEmpty>
												<CommandGroup heading="Available Labels">
													{selectedMetric.labels.map((label) => (
														<CommandItem
															key={label}
															value={label}
															onSelect={() => {
																const newGroupBy = selectedGroupBy.includes(
																	label,
																)
																	? selectedGroupBy.filter((l) => l !== label)
																	: [...selectedGroupBy, label];
																onGroupByChange(newGroupBy);
															}}
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4",
																	selectedGroupBy.includes(label)
																		? "opacity-100"
																		: "opacity-0",
																)}
															/>
															{label}
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							</div>
						)}
						{hasMultipleGroupByFnOptions && (
							<div
								className={cn("space-y-2", disableGroupBy ? "flex-1" : "w-32")}
							>
								<div className="flex items-center gap-1.5">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Apply
									</h3>
									<TooltipProvider delayDuration={300}>
										<Tooltip>
											<TooltipTrigger asChild>
												<HelpCircle className="size-3 text-muted-foreground cursor-help" />
											</TooltipTrigger>
											<TooltipContent side="right">
												<p className="max-w-xs text-sm">
													What function to apply when combining values from
													multiple labels. For example, when combining
													temperature values across different rooms, this allows
													you to choose whether to max, min, or average the
													values.
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
								<Select
									value={selectedGroupByFn || selectedMetric.groupBy[0]}
									onValueChange={onGroupByFnChange}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{selectedMetric.groupBy.includes("sum") && (
											<SelectItem value="sum">Sum</SelectItem>
										)}
										{selectedMetric.groupBy.includes("avg") && (
											<SelectItem value="avg">Average</SelectItem>
										)}
										{selectedMetric.groupBy.includes("min") && (
											<SelectItem value="min">Min</SelectItem>
										)}
										{selectedMetric.groupBy.includes("max") && (
											<SelectItem value="max">Max</SelectItem>
										)}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					{hasMultipleTimeAggregations && (
						<div className="space-y-2 flex-1">
							<div className="flex items-center gap-1.5">
								<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Time Aggregation
								</h3>
								<TooltipProvider delayDuration={300}>
									<Tooltip>
										<TooltipTrigger asChild>
											<HelpCircle className="size-3 text-muted-foreground cursor-help" />
										</TooltipTrigger>
										<TooltipContent side="right">
											<p className="max-w-xs text-sm">
												How to aggregate the metric values over the selected
												time window
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<TooltipProvider delayDuration={300}>
								<Select
									value={
										selectedTimeAggregation || selectedMetric.timeAggregation[0]
									}
									onValueChange={onTimeAggregationChange}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{selectedMetric.timeAggregation.includes("last") && (
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
										{selectedMetric.timeAggregation.includes("avg") && (
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
										{selectedMetric.timeAggregation.includes("min") && (
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
										{selectedMetric.timeAggregation.includes("max") && (
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
										{selectedMetric.timeAggregation.includes("match") && (
											<Tooltip>
												<TooltipTrigger asChild>
													<SelectItem value="match">Match rate</SelectItem>
												</TooltipTrigger>
												<TooltipContent side="right">
													<p className="max-w-xs text-sm">
														Percentage of time where metric matches a condition
													</p>
												</TooltipContent>
											</Tooltip>
										)}
									</SelectContent>
								</Select>
							</TooltipProvider>
						</div>
					)}

					{selectedTimeAggregation === "match" && (
						<div className="space-y-2">
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
								Match Condition
							</h3>
							<div className="flex gap-2">
								<Select
									value={matchOperator}
									onValueChange={(value) => {
										onMatchConditionChange?.(
											value as typeof matchOperator,
											matchValue,
										);
									}}
								>
									<SelectTrigger className="w-24">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="==">=</SelectItem>
										<SelectItem value=">">&gt;</SelectItem>
										<SelectItem value="<">&lt;</SelectItem>
										<SelectItem value=">=">&gt;=</SelectItem>
										<SelectItem value="<=">&lt;=</SelectItem>
										<SelectItem value="!=">!=</SelectItem>
									</SelectContent>
								</Select>
								<Input
									type="number"
									placeholder="Value"
									value={matchValue}
									onChange={(e) => {
										onMatchConditionChange?.(matchOperator, e.target.value);
									}}
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Shows percentage of time where metric {matchOperator}{" "}
								{matchValue || "..."}
							</p>
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
				</>
			)}
		</div>
	);
}

// Helper functions for grouping
function getAggregationGroupKey(
	transform: Transform | null,
	type: MetricType,
): string {
	if (transform?.startsWith("rate")) return "rate";
	else if (transform?.startsWith("p")) return "percentile";
	else if (type === "counter") return "increase";
	return "raw";
}

function getAggregationGroupLabel(groupKey: string): string {
	switch (groupKey) {
		case "increase":
			return "Increase";
		case "rate":
			return "Rate";
		case "percentile":
			return "Percentile";
		default:
			return "Raw";
	}
}

function getAggregationGroupDescription(groupKey: string): string {
	switch (groupKey) {
		case "increase":
			return "Total increase of a counter over the time window. For example: number of new signups in the last hour.";
		case "rate":
			return "Shows the rate of change per time unit (second, minute, hour, or day). For example: number of signups per second.";
		case "percentile":
			return "Shows the value below which a given percentage of observations fall. For example: 90th percentile of response time.";
		default:
			return "Shows the raw value of the metric. For example: Current stock price.";
	}
}
