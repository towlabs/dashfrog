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
import type { Metric } from "@/src/types/metric";
import { MetricAggregationLabel } from "@/src/types/metric";

type MetricSelectorProps = {
	metrics: Metric[];
	metricsLoading: boolean;
	selectedMetricName: string;
	onMetricSelect: (metricName: string) => void;
};

export function MetricSelector({
	metrics,
	metricsLoading,
	selectedMetricName,
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
					{selectedMetricName ? (() => {
						const metric = metrics.find((m) => m.name === selectedMetricName);
						return metric ? `${MetricAggregationLabel[metric.aggregation]} Of ${metric.name}` : "Select a metric...";
					})() : "Select a metric..."}
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
									key={metric.name}
									value={metric.name}
									onSelect={(currentValue) => {
										onMetricSelect(
											currentValue === selectedMetricName ? "" : currentValue,
										);
										setComboboxOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											selectedMetricName === metric.name
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									{MetricAggregationLabel[metric.aggregation]} Of {metric.name}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
