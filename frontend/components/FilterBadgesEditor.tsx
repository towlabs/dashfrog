"use client";

import { ListFilterPlus } from "lucide-react";
import * as React from "react";

import { LabelBadge } from "@/components/LabelBadge";
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
	const [draftLabel, setDraftLabel] = React.useState<string | null>(null);

	const updateFilter = (index: number, value: string) => {
		const next = [...filters];
		next[index] = { ...next[index], value };
		onFiltersChange(next);
	};

	const addFilter = (label: string, value: string) => {
		const next = [...filters, { label, value }];
		onFiltersChange(next);
		setDraftLabel(null);
	};

	const remove = (index: number) => {
		const next = filters.filter((_, i) => i !== index);
		onFiltersChange(next);
	};

	const newFilter = (label: string) => {
		setDraftLabel(label);
		setAddLabelOpen(false);
	};

	return (
		<div className="flex flex-wrap gap-1 items-center">
			{filters.map((filter, index) => {
				if (!filter) return null;

				const labelConfig = availableLabels.find(
					(l) => l.label === filter.label,
				);

				return (
					<LabelBadge
						key={`${filter.label}-${index}`}
						labelKey={filter.label}
						labelValue={filter.value}
						readonly={false}
						availableValues={labelConfig?.values}
						onValueChange={(value) => updateFilter(index, value)}
						onRemove={() => remove(index)}
					/>
				);
			})}
			{draftLabel && (
				<LabelBadge
					key={`${draftLabel}-draft`}
					labelKey={draftLabel}
					labelValue={""}
					readonly={false}
					availableValues={
						availableLabels.find((l) => l.label === draftLabel)?.values
					}
					onValueChange={(value) => {
						if (value) {
							addFilter(draftLabel, value);
						} else {
							setDraftLabel(null);
						}
					}}
					onRemove={() => setDraftLabel(null)}
				/>
			)}
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
										key={label.label}
										value={label.label}
										onSelect={() => newFilter(label.label)}
									>
										{label.label}
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
