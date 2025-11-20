"use client";

import { Check, ChevronsUpDown } from "lucide-react";
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

	return (
		<Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
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
						<CommandGroup>
							{metrics.map((metric) => (
								<CommandItem
									key={`${metric.prometheusName}-${metric.aggregation}`}
									value={`${metric.prometheusName}-${metric.aggregation}`}
									onSelect={() => {
										onMetricSelect(metric);
										setComboboxOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											selectedMetricName === metric.prometheusName &&
												selectedSpatialAggregation === metric.aggregation
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									<span>{metric.prettyName}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
