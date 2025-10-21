import { Info } from "lucide-react";
import * as React from "react";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
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
import { useLabels } from "@/src/contexts/labels";
import { useMetrics } from "@/src/contexts/metrics";
import type { Filter } from "@/src/types/filter";
import type { Metric, MetricKind } from "@/src/types/metric";

interface MetricQueryBuilderProps {
	selectedMetric: Metric<MetricKind> | null;
	onMetricChange: (metric: Metric<MetricKind>) => void;
	filters: Filter[];
	onFiltersChange: (filters: Filter[]) => void;
	className?: string;
}

// Helper component for group heading with tooltip
const GroupHeadingWithTooltip = ({
	label,
	tooltip,
}: {
	label: string;
	tooltip: string;
}) => (
	<div className="flex items-center gap-1.5 text-s font-semibold text-muted-foreground">
		<span>{label}</span>
		<TooltipProvider delayDuration={200}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
				</TooltipTrigger>
				<TooltipContent side="right" className="max-w-[240px] p-3">
					<p className="text-xs leading-relaxed">{tooltip}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	</div>
);

export function MetricQueryBuilder({
	selectedMetric: initialMetric,
	onMetricChange,
	filters: initialFilters,
	onFiltersChange,
	className,
}: MetricQueryBuilderProps) {
	const { metrics: metricsStore } = useMetrics();
	const { labels: labelsStore } = useLabels();

	// Convert MetricsStore to array of Metric objects with label names instead of IDs
	const metrics = React.useMemo(() => {
		return Object.values(metricsStore).map((metric) => {
			// Convert label IDs to label names
			const labelNames = Array.isArray(metric.labels)
				? metric.labels
						.map((labelId: string | number) => {
							if (typeof labelId === "number") {
								return labelsStore[labelId]?.name;
							}
							return labelId;
						})
						.filter(
							(name: string | undefined): name is string => name !== undefined,
						)
				: [];

			return {
				...metric,
				labels: labelNames as string[],
			} as Metric<MetricKind>;
		});
	}, [metricsStore, labelsStore]);

	const [selectedMetric, setSelectedMetric] =
		React.useState<Metric<MetricKind> | null>(initialMetric || null);
	const [filters, setFilters] = React.useState<Filter[]>(initialFilters || []);
	const [metricPickerOpen, setMetricPickerOpen] = React.useState(false);

	// Sync external metric to internal state
	React.useEffect(() => {
		if (initialMetric !== undefined) {
			setSelectedMetric(initialMetric);
		}
	}, [initialMetric]);

	// Sync external filters to internal state
	React.useEffect(() => {
		if (initialFilters !== undefined) {
			setFilters(initialFilters);
		}
	}, [initialFilters]);

	// Group metrics by type
	const eventMetrics = metrics.filter((m) => m.kind === "events");
	const snapshotMetrics = metrics.filter((m) => m.kind === "values");
	const statisticMetrics = metrics.filter((m) => m.kind === "distribution");

	// Handle metric selection
	const handleMetricSelect = (metric: Metric<MetricKind>) => {
		setSelectedMetric(metric);
		setFilters([]);
		setMetricPickerOpen(false);
		// Notify parent of the change
		onMetricChange(metric);
		onFiltersChange([]);
	};

	return (
		<div className={cn("flex flex-col gap-1", className)}>
			{/* Metric Selection */}
			<div className="space-y-1">
				<label className="text-xs text-muted-foreground font-medium">
					Metric
				</label>
				<Popover
					open={metricPickerOpen}
					onOpenChange={setMetricPickerOpen}
					modal={true}
				>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="justify-between w-full text-center"
						>
							<span className={selectedMetric ? "" : "text-muted-foreground"}>
								{selectedMetric ? selectedMetric.displayAs : "Choose metric..."}
							</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-[320px] h-72 p-0 overflow-hidden"
						align="start"
					>
						<Command className="h-full">
							<CommandInput placeholder="Search metrics..." />
							<CommandList className="max-h-full overflow-auto">
								<CommandEmpty>No metrics found.</CommandEmpty>
								{eventMetrics.length > 0 && (
									<CommandGroup
										heading={
											<GroupHeadingWithTooltip
												label="Events"
												tooltip="Count how many times something happens. Common examples are: orders, clicks, errors, messages sent."
											/>
										}
									>
										{eventMetrics.map((metric) => (
											<CommandItem
												key={metric.key}
												value={metric.key}
												onSelect={() => handleMetricSelect(metric)}
											>
												<div className="flex w-full items-start gap-2">
													<div className="flex flex-col flex-1">
														<span className="font-medium">
															{metric.displayAs}
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
									<CommandGroup
										heading={
											<GroupHeadingWithTooltip
												label="Values"
												tooltip="Track levels that change over time. Common examples are: users online, memory usage, queue depth, storage used."
											/>
										}
									>
										{snapshotMetrics.map((metric) => (
											<CommandItem
												key={metric.key}
												value={metric.key}
												onSelect={() => handleMetricSelect(metric)}
											>
												<div className="flex w-full items-start gap-2">
													<div className="flex flex-col flex-1">
														<span className="font-medium">
															{metric.displayAs}
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
									<CommandGroup
										heading={
											<GroupHeadingWithTooltip
												label="Distributions"
												tooltip="Measure things that vary each time. Common examples are: page load time, delivery duration, file size, order value."
											/>
										}
									>
										{statisticMetrics.map((metric) => (
											<CommandItem
												key={metric.key}
												value={metric.key}
												onSelect={() => handleMetricSelect(metric)}
											>
												<div className="flex w-full items-start gap-2">
													<div className="flex flex-col flex-1">
														<span className="font-medium">
															{metric.displayAs}
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
					</PopoverContent>
				</Popover>
			</div>

			{/* Filters */}
			{selectedMetric && (
				<FilterBadgesEditor
					availableLabels={
						Array.isArray(selectedMetric.labels)
							? (selectedMetric.labels.filter(
									(label) => typeof label === "string",
								) as string[])
							: []
					}
					filters={filters}
					onFiltersChange={(newFilters) => {
						setFilters(newFilters);
						onFiltersChange(newFilters);
					}}
				/>
			)}
		</div>
	);
}
