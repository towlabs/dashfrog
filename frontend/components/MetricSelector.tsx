"use client";

import { Check, ChevronsUpDown, HelpCircle, SquareStack } from "lucide-react";
import React, { useState } from "react";
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
	Metric,
	TimeAggregation,
	Transform,
} from "@/src/types/metric";
import { FilterBadgesEditor } from "./FilterBadgesEditor";
import { Separator } from "./ui/separator";

type MetricSelectorProps = {
	metrics: Metric[];
	selectedMetric: Metric | null;
	selectedTimeAggregation?: TimeAggregation | null;
	selectedGroupBy: string[];
	selectedGroupByFn: GroupByFn | null;
	blockFilters: Filter[];
	matchOperator?: "==" | ">" | "<" | ">=" | "<=" | "!=";
	matchValue?: string;
	selectedTransform: Transform | null;
	selectedTransformMetadata: any;
	onMetricSelect: (metric: Metric) => void;
	onTimeAggregationChange?: (timeAggregation: TimeAggregation) => void;
	onGroupByChange: (labels: string[]) => void;
	onGroupByFnChange: (groupByFn: GroupByFn) => void;
	onFiltersChange: (filters: Filter[]) => void;
	onMatchConditionChange?: (
		operator: "==" | ">" | "<" | ">=" | "<=" | "!=",
		value: string,
	) => void;
	onTransformChange: (transform: Transform | null, metadata: any) => void;
};

export function MetricSelector({
	metrics,
	selectedMetric,
	selectedTimeAggregation,
	selectedGroupBy,
	selectedGroupByFn,
	selectedTransform,
	selectedTransformMetadata,
	blockFilters,
	matchOperator = "==",
	matchValue = "",
	onMetricSelect,
	onTransformChange,
	onTimeAggregationChange,
	onGroupByChange,
	onGroupByFnChange,
	onFiltersChange,
	onMatchConditionChange,
}: MetricSelectorProps) {
	const labels = useLabelsStore((state) => state.labels);
	const [comboboxOpen, setComboboxOpen] = useState(false);
	const [groupedByExpanded, setGroupedByExpanded] = useState(
		selectedGroupBy.length > 0,
	);

	const hasMultipleTimeAggregations =
		selectedMetric && selectedMetric.timeAggregation.length > 1;
	const hasMultipleGroupByFnOptions =
		selectedMetric && selectedMetric.groupBy.length > 1;
	const groupByLabels = React.useMemo(() => {
		if (selectedTransform === "ratio") {
			const ratioFilters = (selectedTransformMetadata.filters || []).map(
				(filter: Filter) => filter.label,
			);
			return selectedMetric?.labels.filter(
				(label) => !ratioFilters.includes(label),
			);
		}
		return selectedMetric?.labels;
	}, [selectedMetric, selectedTransform, selectedTransformMetadata]);
	const disableGroupBy = React.useMemo(
		() => (groupByLabels?.length ?? 0) === 0,
		[groupByLabels],
	);

	if (metrics.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">No metrics available</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className={cn("space-y-2", "full-w")}>
				<div className="flex items-center gap-1.5">
					<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Additional Filters
					</h3>
				</div>
				<FilterBadgesEditor
					availableLabels={labels}
					filters={blockFilters}
					onFiltersChange={onFiltersChange}
				/>
			</div>

			<Separator className="w-full" />

			<div className={cn("space-y-2", "full-w")}>
				<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
					Show
				</h3>
				<div className="flex items-center justify-between w-full gap-1">
					<div className="flex-1 min-w-0">
						<Popover
							open={comboboxOpen}
							onOpenChange={setComboboxOpen}
							modal={true}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={comboboxOpen}
									className="justify-between w-full"
								>
									<span className="truncate">
										{selectedMetric
											? selectedMetric.prettyName
											: "Select a metric..."}
									</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[400px] p-0">
								<Command>
									<CommandInput placeholder="Search metrics..." />
									<CommandList>
										<CommandEmpty>No metric found.</CommandEmpty>
										<CommandGroup>
											{metrics.map((metric) => {
												return (
													<CommandItem
														key={metric.id}
														value={metric.prettyName}
														onSelect={() => {
															onMetricSelect(metric);
															// Set default timeAggregation if not already set
															if (
																(!selectedTimeAggregation ||
																	!metric.timeAggregation.includes(
																		selectedTimeAggregation,
																	)) &&
																onTimeAggregationChange
															) {
																onTimeAggregationChange(
																	metric.timeAggregation[0],
																);
															}
															// Set default groupBy if not already set
															if (
																!selectedGroupByFn ||
																!metric.groupBy.includes(selectedGroupByFn)
															) {
																onGroupByFnChange(metric.groupBy[0]);
															}
															setComboboxOpen(false);
															// Set default transform
															if (metric.type === "rate") {
																onTransformChange("ratePerSecond", {});
															} else if (metric.type === "histogram") {
																onTransformChange("p50", {});
															} else if (metric.type === "ratio") {
																onTransformChange("ratio", {
																	filters: [],
																});
															} else {
																onTransformChange(null, {});
															}
														}}
													>
														<TooltipProvider>
															<Tooltip>
																<TooltipTrigger asChild>
																	<div className="flex items-center justify-between w-full">
																		<span>{metric.prettyName}</span>
																		<Check
																			className={cn(
																				"mr-2 h-4 w-4",
																				selectedMetric?.id === metric.id
																					? "opacity-100"
																					: "opacity-0",
																			)}
																		/>
																	</div>
																</TooltipTrigger>
																<TooltipContent side="left">
																	{getMetricTooltip(metric)}
																</TooltipContent>
															</Tooltip>
														</TooltipProvider>
													</CommandItem>
												);
											})}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
					{selectedMetric && selectedMetric.type === "histogram" && (
						<Select
							value={selectedTransform || ""}
							onValueChange={(transform) => {
								onTransformChange(transform as Transform, {});
							}}
						>
							<SelectTrigger className="w-18">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="p50">P50</SelectItem>
								<SelectItem value="p90">P90</SelectItem>
								<SelectItem value="p95">P95</SelectItem>
								<SelectItem value="p99">P99</SelectItem>
							</SelectContent>
						</Select>
					)}
					{selectedMetric && selectedMetric.type === "rate" && (
						<Select
							value={selectedTransform || ""}
							onValueChange={(transform) => {
								onTransformChange(transform as Transform, {});
							}}
						>
							<SelectTrigger className="w-28">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ratePerSecond">/second</SelectItem>
								<SelectItem value="ratePerMinute">/minute</SelectItem>
								<SelectItem value="ratePerHour">/hour</SelectItem>
								<SelectItem value="ratePerDay">/day</SelectItem>
							</SelectContent>
						</Select>
					)}
					<div>
						{!groupedByExpanded && !disableGroupBy && (
							<TooltipProvider delayDuration={300}>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											className="text-muted-foreground cursor-pointer"
											size="icon"
											onClick={() => setGroupedByExpanded(!groupedByExpanded)}
										>
											<SquareStack className="size-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="right">
										Labels to group by. If no labels are selected, all values
										will be combined into a single one.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
				</div>
			</div>

			{selectedMetric && selectedMetric.type === "ratio" && (
				<div className={cn("space-y-2", "full-w")}>
					<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
						Of
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<HelpCircle className="size-3 text-muted-foreground cursor-help" />
								</TooltipTrigger>
								<TooltipContent side="right">
									<p className="max-w-xs text-sm">
										Which ratio condition to apply to the metric.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</h3>
					<div className="flex items-center justify-between w-full gap-1">
						<FilterBadgesEditor
							availableLabels={labels}
							filters={selectedTransformMetadata.filters ?? []}
							onFiltersChange={(filters) => {
								onTransformChange(selectedTransform, {
									filters,
								});
							}}
						/>
					</div>
				</div>
			)}

			{groupedByExpanded && selectedMetric && !disableGroupBy && (
				<div className="space-y-2 flex-1">
					<div className="flex items-center gap-1.5">
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Grouped by
						</h3>
						<TooltipProvider delayDuration={300}>
							<Tooltip>
								<TooltipTrigger asChild>
									<HelpCircle className="size-3 text-muted-foreground cursor-help" />
								</TooltipTrigger>
								<TooltipContent side="right">
									<p className="max-w-xs text-sm">
										Labels to group by. If no labels are selected, all values
										will be combined into a single one.
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
										{groupByLabels?.map((label) => (
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
			)}

			{hasMultipleGroupByFnOptions && (
				<div className={cn("space-y-2", "full-w")}>
					<div className="flex items-center gap-1.5">
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Cross-label aggregation
						</h3>
						<TooltipProvider delayDuration={300}>
							<Tooltip>
								<TooltipTrigger asChild>
									<HelpCircle className="size-3 text-muted-foreground cursor-help" />
								</TooltipTrigger>
								<TooltipContent side="right">
									<p className="max-w-xs text-sm">
										If we have values from different labels, this allows us to
										specify how to combine them.
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
								<SelectItem value="sum">Sum values across labels</SelectItem>
							)}
							{selectedMetric.groupBy.includes("avg") && (
								<SelectItem value="avg">
									Average values across labels
								</SelectItem>
							)}
							{selectedMetric.groupBy.includes("min") && (
								<SelectItem value="min">
									Keep the lowest value across labels
								</SelectItem>
							)}
							{selectedMetric.groupBy.includes("max") && (
								<SelectItem value="max">
									Keep the highest value across labels
								</SelectItem>
							)}
						</SelectContent>
					</Select>
				</div>
			)}

			<Separator className="w-full" />

			{selectedMetric && onTimeAggregationChange && (
				<>
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
													<SelectItem value="last">
														Most recent value
													</SelectItem>
												</TooltipTrigger>
												<TooltipContent side="right">
													<p className="max-w-xs text-sm">
														Keep the most recent value in the time window
													</p>
												</TooltipContent>
											</Tooltip>
										)}
										{selectedMetric.timeAggregation.includes("avg") && (
											<Tooltip>
												<TooltipTrigger asChild>
													<SelectItem value="avg">
														Average over period
													</SelectItem>
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
													<SelectItem value="min">
														Minimum over period
													</SelectItem>
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
													<SelectItem value="max">
														Maximum over period
													</SelectItem>
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
													<SelectItem value="match">
														Match percentage
													</SelectItem>
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
				</>
			)}
		</div>
	);
}

function getMetricTooltip(metric: Metric): string {
	if (metric.type === "rate") {
		return "Answers questions like: how many signups do we have per second/minute/hour/day?";
	} else if (metric.type === "increase") {
		return "Answers questions like: how many new signups did we have in the last hour?";
	} else if (metric.type === "ratio") {
		return `Answers questions like: what percentage of signups are from the USA?`;
	} else if (metric.type === "histogram") {
		return "Answers questions like: what is the response time for 95% of requests?";
	}
	return "Raw value of the metric.";
}
