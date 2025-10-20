"use client";

import {
	ArrowLeft,
	ChartLine,
	ChartScatter,
	ChartSpline,
	ChevronLeft,
	Info,
	Plus,
	X,
} from "lucide-react";
import * as React from "react";
import type { Metric, Operation } from "@/components/metric-types";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
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
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
} from "@/src/components/ui/shadcn-io/combobox";

const DEFAULT_METRICS: Metric[] = [
	{
		name: "requests_total",
		label: "Total Requests",
		description: "Total number of requests",
		unit: "count",
		labels: ["status", "method", "endpoint"],
		metricType: "counter",
	},
	{
		name: "response_time",
		label: "Response Time",
		description: "Response time distribution",
		unit: "ms",
		labels: ["endpoint", "region"],
		metricType: "statistic",
	},
	{
		name: "error_rate",
		label: "Error Rate",
		description: "Percentage of failed requests",
		unit: "%",
		labels: ["status", "endpoint", "service"],
		metricType: "counter",
	},
	{
		name: "cpu_usage",
		label: "CPU Usage",
		description: "CPU utilization percentage",
		unit: "%",
		labels: ["service", "region"],
		metricType: "measure",
	},
	{
		name: "memory_usage",
		label: "Memory Usage",
		description: "Memory utilization",
		unit: "MB",
		labels: ["service", "region"],
		metricType: "measure",
	},
	{
		name: "workflow_duration",
		label: "Workflow Duration",
		description: "Duration of a workflow in seconds",
		unit: "s",
		labels: ["workflow", "status"],
		metricType: "statistic",
	},
	{
		name: "workflow_status",
		label: "Workflow Status",
		description:
			"Status of a workflow, 1 for success, 0 for failure, and 2 for running",
		unit: "count",
		labels: ["workflow", "status"],
		metricType: "counter",
	},
];

const OPERATIONS: Operation[] = [
	{
		name: "average",
		label: "Average",
		description: "Calculate average value over time",
		type: "aggregation",
		applicableTo: ["statistic"],
	},
	{
		name: "p50",
		label: "Median",
		description: "50th percentile (median) over time",
		type: "aggregation",
		applicableTo: ["statistic"],
	},
	{
		name: "p90",
		label: "90th Percentile",
		description: "90th percentile over time",
		type: "aggregation",
		applicableTo: ["statistic"],
	},
	{
		name: "p95",
		label: "95th Percentile",
		description: "95th percentile over time",
		type: "aggregation",
		applicableTo: ["statistic"],
	},
	{
		name: "p99",
		label: "99th Percentile",
		description: "99th percentile over time",
		type: "aggregation",
		applicableTo: ["statistic"],
	},
];

type FilterOperator = "=" | "!=" | "contains" | "regex";

type Filter = {
	label: string;
	operator: FilterOperator;
	value: string;
};

interface MetricQueryBuilderProps {
	value?: string;
	onChange?: (value: string) => void;
	selectedMetric?: Metric | null;
	onMetricChange?: (metric: Metric | null) => void;
	selectedOperation?: Operation | null;
	onOperationChange?: (operation: Operation | null) => void;
	filters?: Filter[];
	onFiltersChange?: (filters: Filter[]) => void;
	metrics?: Metric[];
	className?: string;
	enableOperationSelector?: boolean; // Enable 2-step selection for statistics
}

export type { Filter, FilterOperator };

// Helper component for group heading with tooltip
const GroupHeadingWithTooltip = ({
	label,
	tooltip,
	icon: Icon,
}: {
	label: string;
	tooltip: string;
	icon: React.ComponentType<{ className?: string }>;
}) => (
	<div className="flex items-center gap-1.5">
		<span>{label}</span>
		<TooltipProvider delayDuration={200}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
				</TooltipTrigger>
				<TooltipContent side="right" className="max-w-[160px] p-2">
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-center w-full aspect-[10/7] bg-background rounded-md border">
							<Icon className="h-12 w-12 text-[#2e2e2d]" />
						</div>
						<p className="text-xs leading-relaxed">{tooltip}</p>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	</div>
);

export function MetricQueryBuilder({
	onChange,
	selectedMetric: initialMetric,
	onMetricChange,
	selectedOperation: initialOperation,
	onOperationChange,
	filters: initialFilters,
	onFiltersChange,
	metrics = DEFAULT_METRICS,
	className,
	enableOperationSelector = true,
}: MetricQueryBuilderProps) {
	const [selectedMetric, setSelectedMetric] = React.useState<Metric | null>(
		initialMetric || null,
	);
	const [filters, setFilters] = React.useState<Filter[]>(initialFilters || []);
	const [selectedOperation, setSelectedOperation] =
		React.useState<Operation | null>(initialOperation || null);
	const [metricPickerOpen, setMetricPickerOpen] = React.useState(false);
	const [filterOpen, setFilterOpen] = React.useState(false);
	const [editingFilterIndex, setEditingFilterIndex] = React.useState<
		number | null
	>(null);
	const [fadingFilters, setFadingFilters] = React.useState<Set<number>>(
		new Set(),
	);
	// Draft state for filter being edited - only committed when popover closes
	const [draftFilter, setDraftFilter] = React.useState<Filter | null>(null);
	// State for 2-step statistic selection
	const [metricSelectionStep, setMetricSelectionStep] = React.useState<
		"metrics" | "operations"
	>("metrics");
	const [pendingStatistic, setPendingStatistic] = React.useState<Metric | null>(
		null,
	);

	// Sync external metric to internal state
	React.useEffect(() => {
		if (initialMetric !== undefined) {
			setSelectedMetric(initialMetric);
		}
	}, [initialMetric]);

	// Sync external operation to internal state
	React.useEffect(() => {
		if (initialOperation !== undefined) {
			setSelectedOperation(initialOperation);
		}
	}, [initialOperation]);

	// Sync external filters to internal state
	React.useEffect(() => {
		if (initialFilters !== undefined) {
			setFilters(initialFilters);
		}
	}, [initialFilters]);

	// Group metrics by type
	const eventMetrics = metrics.filter((m) => m.metricType === "counter");
	const snapshotMetrics = metrics.filter((m) => m.metricType === "measure");
	const statisticMetrics = metrics.filter((m) => m.metricType === "statistic");

	// Get available operations for selected metric or pending statistic
	const availableOperations =
		pendingStatistic || selectedMetric
			? OPERATIONS.filter((op) =>
					op.applicableTo.includes(
						(pendingStatistic || selectedMetric)!.metricType,
					),
				)
			: [];

	// Prepare metrics data for Combobox
	const metricsData = metrics.map((m) => ({
		value: m.name,
		label: m.label,
	}));

	// Notify parent of metric changes
	React.useEffect(() => {
		onMetricChange?.(selectedMetric);
	}, [selectedMetric, onMetricChange]);

	// Notify parent of operation changes
	React.useEffect(() => {
		onOperationChange?.(selectedOperation);
	}, [selectedOperation, onOperationChange]);

	// Notify parent of filter changes
	React.useEffect(() => {
		onFiltersChange?.(filters);
	}, [filters, onFiltersChange]);

	// Build query string whenever selections change
	React.useEffect(() => {
		if (!selectedMetric) {
			return;
		}

		let query = selectedMetric.name;

		// Add filters (only those with non-empty values)
		const validFilters = filters.filter((f) => f.value.trim() !== "");
		if (validFilters.length > 0) {
			validFilters.forEach((filter) => {
				query += `.filter("${filter.label}", "${filter.value}")`;
			});
		}

		// Add operation
		if (selectedOperation) {
			query += `.${selectedOperation.name}()`;
		}

		onChange?.(query);
	}, [selectedMetric, filters, selectedOperation, onChange]);

	// Remove filters with empty values after a delay with fade animation
	React.useEffect(() => {
		const timer = setTimeout(() => {
			const filtersToRemove = filters
				.map((f, i) => ({ filter: f, index: i }))
				.filter(
					({ filter, index }) =>
						filter.value.trim() === "" && editingFilterIndex !== index,
				);

			if (filtersToRemove.length > 0) {
				// First add them to fading set
				setFadingFilters(new Set(filtersToRemove.map((f) => f.index)));

				// Then remove after animation completes
				setTimeout(() => {
					setFilters(filters.filter((f) => f.value.trim() !== ""));
					setFadingFilters(new Set());
				}, 200); // Match CSS transition duration
			}
		}, 2000); // Wait 2 seconds before removing empty filters

		return () => clearTimeout(timer);
	}, [filters, editingFilterIndex]);

	const addFilter = (label: string) => {
		const newFilter = { label, operator: "=" as FilterOperator, value: "" };
		setDraftFilter(newFilter);
		setFilterOpen(false);
		setEditingFilterIndex(filters.length);
	};

	const updateDraftFilter = (updates: Partial<Filter>) => {
		if (draftFilter) {
			setDraftFilter({ ...draftFilter, ...updates });
		} else if (editingFilterIndex !== null) {
			setDraftFilter({ ...filters[editingFilterIndex], ...updates });
		}
	};

	const commitFilter = () => {
		if (draftFilter && editingFilterIndex !== null) {
			// Only commit if the filter has a value
			if (draftFilter.value.trim() !== "") {
				const newFilters = [...filters];
				if (editingFilterIndex >= filters.length) {
					// Adding new filter
					newFilters.push(draftFilter);
				} else {
					// Updating existing filter
					newFilters[editingFilterIndex] = draftFilter;
				}
				setFilters(newFilters);
			}
		}
		setDraftFilter(null);
		setEditingFilterIndex(null);
	};

	const removeFilter = (index: number) => {
		setFilters(filters.filter((_, i) => i !== index));
		if (editingFilterIndex === index) {
			setEditingFilterIndex(null);
			setDraftFilter(null);
		}
	};

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{/* Metric Selection */}
			<div className="space-y-1">
				<label className="text-xs text-muted-foreground font-medium">
					Metric
				</label>
				<Popover
					open={metricPickerOpen}
					onOpenChange={(open) => {
						setMetricPickerOpen(open);
						if (!open) {
							setPendingStatistic(null);
							setMetricSelectionStep("metrics");
						} else {
							// When opening, if a statistic is already selected and operation selector is enabled, go to operations step
							if (
								enableOperationSelector &&
								selectedMetric?.metricType === "statistic"
							) {
								setPendingStatistic(selectedMetric);
								setMetricSelectionStep("operations");
							} else {
								setMetricSelectionStep("metrics");
							}
						}
					}}
					modal={true}
				>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="justify-between w-full text-center"
						>
							<span className={selectedMetric ? "" : "text-muted-foreground"}>
								{selectedMetric
									? `${selectedMetric.label}${selectedOperation ? ` (${selectedOperation.label})` : ""}`
									: "Choose metric..."}
							</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-[320px] h-72 p-0 overflow-hidden"
						align="start"
					>
						{metricSelectionStep === "metrics" ? (
							/* Step 1: Choose metric */
							<Command className="h-full">
								<CommandInput placeholder="Search metrics..." />
								<CommandList className="max-h-full overflow-auto">
									<CommandEmpty>No metrics found.</CommandEmpty>
									{eventMetrics.length > 0 && (
										<CommandGroup heading="Counters">
											{eventMetrics.map((metric) => (
												<CommandItem
													key={metric.name}
													value={metric.name}
													onSelect={() => {
														setSelectedMetric(metric);
														setFilters([]);
														setSelectedOperation(null);
														setMetricPickerOpen(false);
														setMetricSelectionStep("metrics");
													}}
												>
													<div className="flex w-full items-start gap-2">
														<div className="flex flex-col flex-1">
															<span className="font-medium">
																{metric.label}
															</span>
															<span className="text-xs text-muted-foreground">
																{metric.description}
															</span>
														</div>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{snapshotMetrics.length > 0 && (
										<CommandGroup heading="Measures">
											{snapshotMetrics.map((metric) => (
												<CommandItem
													key={metric.name}
													value={metric.name}
													onSelect={() => {
														setSelectedMetric(metric);
														setFilters([]);
														setSelectedOperation(null);
														setMetricPickerOpen(false);
														setMetricSelectionStep("metrics");
													}}
												>
													<div className="flex w-full items-start gap-2">
														<div className="flex flex-col flex-1">
															<span className="font-medium">
																{metric.label}
															</span>
															<span className="text-xs text-muted-foreground">
																{metric.description}
															</span>
														</div>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{statisticMetrics.length > 0 && (
										<CommandGroup heading="Statistics">
											{statisticMetrics.map((metric) => (
												<CommandItem
													key={metric.name}
													value={metric.name}
													onSelect={() => {
														if (enableOperationSelector) {
															// Enable 2-step selection
															setPendingStatistic(metric);
															setMetricSelectionStep("operations");
														} else {
															// Select directly without operation
															setSelectedMetric(metric);
															setFilters([]);
															setSelectedOperation(null);
															setMetricPickerOpen(false);
															setMetricSelectionStep("metrics");
														}
													}}
												>
													<div className="flex w-full items-start gap-2">
														<div className="flex flex-col flex-1">
															<span className="font-medium">
																{metric.label}
															</span>
															<span className="text-xs text-muted-foreground">
																{metric.description}
															</span>
														</div>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
								</CommandList>
							</Command>
						) : (
							/* Step 2: Choose operation (for statistics) */
							<div className="h-full flex flex-col">
								<Command className="flex-1">
									<CommandInput placeholder="Search functions..." />
									<CommandList className="max-h-full overflow-auto">
										<CommandEmpty>No functions found.</CommandEmpty>
										<CommandGroup
											heading={
												pendingStatistic
													? `Apply function to ${pendingStatistic.label}`
													: "Functions"
											}
										>
											{availableOperations.map((operation) => (
												<CommandItem
													key={operation.name}
													value={operation.name}
													onSelect={() => {
														if (pendingStatistic) {
															setSelectedMetric(pendingStatistic);
															setSelectedOperation(operation);
															setFilters([]);
															setPendingStatistic(null);
															setMetricPickerOpen(false);
															setMetricSelectionStep("metrics");
														}
													}}
												>
													<div className="flex flex-col">
														<span className="font-medium">
															{operation.label}
														</span>
														<span className="text-xs text-muted-foreground">
															{operation.description}
														</span>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
								{/* Footer with back button */}
								<div className="border-t p-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setPendingStatistic(null);
											setMetricSelectionStep("metrics");
										}}
									>
										<ChevronLeft className="h-3.5 w-3.5" />
										Back
									</Button>
								</div>
							</div>
						)}
					</PopoverContent>
				</Popover>
			</div>

			{/* Filters */}
			{selectedMetric && (
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground font-medium">
						Filters
					</label>
					<div className="flex flex-wrap gap-2">
						{filters.map((filter, index) => {
							// Don't show filter badge if value is empty and not being edited
							if (
								filter.value.trim() === "" &&
								editingFilterIndex !== index &&
								!fadingFilters.has(index)
							) {
								return null;
							}

							const isFading = fadingFilters.has(index);

							const currentFilter =
								editingFilterIndex === index && draftFilter
									? draftFilter
									: filter;

							return (
								<Popover
									key={index}
									open={editingFilterIndex === index}
									onOpenChange={(open) => {
										if (open) {
											// Opening - load filter into draft
											setEditingFilterIndex(index);
											setDraftFilter(filter);
										} else {
											// Closing - commit the draft
											commitFilter();
										}
									}}
								>
									<PopoverTrigger asChild>
										<Badge
											variant="secondary"
											className={cn(
												"gap-1 cursor-pointer hover:bg-secondary/80 transition-all duration-200",
												isFading && "opacity-0 scale-95",
											)}
										>
											{filter.label} {filter.operator} {filter.value || '""'}
											<X
												className="h-3 w-3 cursor-pointer hover:text-destructive"
												onClick={(e) => {
													e.stopPropagation();
													removeFilter(index);
												}}
											/>
										</Badge>
									</PopoverTrigger>
									<PopoverContent className="w-[300px] p-4" align="start">
										<div className="space-y-4">
											<div className="space-y-2">
												<Label className="text-xs">Operator</Label>
												<Select
													value={currentFilter.operator}
													onValueChange={(value) =>
														updateDraftFilter({
															operator: value as FilterOperator,
														})
													}
												>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="=">=</SelectItem>
														<SelectItem value="!=">!=</SelectItem>
														<SelectItem value="contains">contains</SelectItem>
														<SelectItem value="regex">regex</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<Label className="text-xs">Value</Label>
												<Input
													value={currentFilter.value}
													onChange={(e) =>
														updateDraftFilter({ value: e.target.value })
													}
													placeholder="Enter value..."
													className="h-8"
													autoFocus
												/>
											</div>
										</div>
									</PopoverContent>
								</Popover>
							);
						})}
						{/* Render draft filter badge if we're adding a new filter */}
						{draftFilter &&
							editingFilterIndex !== null &&
							editingFilterIndex >= filters.length && (
								<Popover
									open={true}
									onOpenChange={(open) => {
										if (!open) {
											// Closing - commit the draft
											commitFilter();
										}
									}}
								>
									<PopoverTrigger asChild>
										<Badge
											variant="secondary"
											className="gap-1 cursor-pointer hover:bg-secondary/80 transition-all duration-200"
										>
											{draftFilter.label} {draftFilter.operator}{" "}
											{draftFilter.value || '""'}
											<X
												className="h-3 w-3 cursor-pointer hover:text-destructive"
												onClick={(e) => {
													e.stopPropagation();
													setDraftFilter(null);
													setEditingFilterIndex(null);
												}}
											/>
										</Badge>
									</PopoverTrigger>
									<PopoverContent className="w-[300px] p-4" align="start">
										<div className="space-y-4">
											<div className="space-y-2">
												<Label className="text-xs">Operator</Label>
												<Select
													value={draftFilter.operator}
													onValueChange={(value) =>
														updateDraftFilter({
															operator: value as FilterOperator,
														})
													}
												>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="=">=</SelectItem>
														<SelectItem value="!=">!=</SelectItem>
														<SelectItem value="contains">contains</SelectItem>
														<SelectItem value="regex">regex</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<Label className="text-xs">Value</Label>
												<Input
													value={draftFilter.value}
													onChange={(e) =>
														updateDraftFilter({ value: e.target.value })
													}
													placeholder="Enter value..."
													className="h-8"
													autoFocus
												/>
											</div>
										</div>
									</PopoverContent>
								</Popover>
							)}
						<Popover open={filterOpen} onOpenChange={setFilterOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" size="sm" className="h-6">
									<Plus className="h-3 w-3 mr-1" />
									Add filter
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[300px] p-0" align="start">
								<Command>
									<CommandInput placeholder="Search labels..." />
									<CommandList>
										<CommandEmpty>No labels found.</CommandEmpty>
										<CommandGroup heading="Available Labels">
											{selectedMetric.labels?.map((label) => (
												<CommandItem
													key={label}
													value={label}
													onSelect={() => addFilter(label)}
												>
													{label}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			)}
		</div>
	);
}
