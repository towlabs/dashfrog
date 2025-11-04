"use client";

import { ListFilterPlus, X } from "lucide-react";
import * as React from "react";

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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { Filter } from "@/src/types/filter";
import type { Label as LabelType } from "@/src/types/label";

type Props = {
	availableLabels: LabelType[];
	filters: Filter[];
	onFiltersChange: (next: Filter[]) => void;
};

export function FilterBadgesEditor({
	availableLabels,
	filters,
	onFiltersChange,
}: Props) {
	const [addLabelOpen, setAddLabelOpen] = React.useState(false);
	const [editingFilterIndex, setEditingFilterIndex] = React.useState<
		number | null
	>(null);

	const updateFilter = (index: number, value: string) => {
		const next = [...filters];
		next[index] = { ...next[index], value };
		onFiltersChange(next);
		setEditingFilterIndex(null);
	};

	const addFilter = (label: string) => {
		const newIndex = filters.length;
		onFiltersChange([...filters, { label, value: "" }]);
		setAddLabelOpen(false);
		// Automatically open the value dropdown for the new filter
		setEditingFilterIndex(newIndex);
	};

	const remove = (index: number) => {
		onFiltersChange(filters.filter((_, i) => i !== index));
		setEditingFilterIndex(null);
	};

	const handlePopoverClose = (index: number) => {
		// If the filter value is empty when closing, remove the filter
		if (filters[index]?.value === "") {
			remove(index);
		} else {
			setEditingFilterIndex(null);
		}
	};

	return (
		<div className="flex flex-wrap gap-1 items-center">
			{filters.map((filter, index) => {
				const labelConfig = availableLabels.find(
					(l) => l.name === filter.label,
				);

				return (
					<Popover
						key={`${filter.label}-${index}`}
						open={editingFilterIndex === index}
						onOpenChange={(open) => {
							if (open) {
								setEditingFilterIndex(index);
							} else {
								handlePopoverClose(index);
							}
						}}
					>
						<PopoverTrigger asChild>
							<Badge
								variant="secondary"
								className="gap-1 cursor-pointer hover:bg-secondary/80 transition-all duration-200 border-0 h-6 px-3"
							>
								{filter.label}
								{filter.value && `: ${filter.value}`}
								<X
									className="h-3 w-3 cursor-pointer hover:text-destructive"
									onClick={(e) => {
										e.stopPropagation();
										remove(index);
									}}
								/>
							</Badge>
						</PopoverTrigger>
						<PopoverContent className="w-[200px] p-0" align="start">
							<Command>
								<CommandInput placeholder="Search values..." />
								<CommandList className="max-h-[200px]">
									<CommandEmpty>No values found.</CommandEmpty>
									<CommandGroup>
										{labelConfig?.values.map((val) => (
											<CommandItem
												key={val}
												value={val}
												onSelect={() => {
													updateFilter(index, val);
												}}
											>
												{val}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				);
			})}

			<Popover open={addLabelOpen} onOpenChange={setAddLabelOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="justify-start text-sm text-muted-foreground h-6"
					>
						<ListFilterPlus className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[200px] p-0" align="start">
					<Command>
						<CommandInput placeholder="Search labels..." />
						<CommandList className="max-h-[300px]">
							<CommandEmpty>No labels found.</CommandEmpty>
							<CommandGroup heading="Labels">
								{availableLabels.map((label) => (
									<CommandItem
										key={label.name}
										value={label.name}
										onSelect={() => addFilter(label.name)}
									>
										{label.name}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
