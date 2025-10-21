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
import { cn } from "@/lib/utils";
import type { Filter, FilterOperator } from "@/src/types/filter";

type Props = {
	availableLabels: string[] | undefined;
	filters: Filter[];
	onFiltersChange: (next: Filter[]) => void;
};

export function FilterBadgesEditor({
	availableLabels,
	filters,
	onFiltersChange,
}: Props) {
	const [filterOpen, setFilterOpen] = React.useState(false);
	const [editingFilterIndex, setEditingFilterIndex] = React.useState<
		number | null
	>(null);
	const [fadingFilters, setFadingFilters] = React.useState<Set<number>>(
		new Set(),
	);
	const [draftFilter, setDraftFilter] = React.useState<Filter | null>(null);

	React.useEffect(() => {
		const timer = setTimeout(() => {
			const toRemove = filters
				.map((f, i) => ({ f, i }))
				.filter(
					({ f, i }) => f.value.trim() === "" && editingFilterIndex !== i,
				);
			if (toRemove.length > 0) {
				setFadingFilters(new Set(toRemove.map((x) => x.i)));
				setTimeout(() => {
					onFiltersChange(filters.filter((f) => f.value.trim() !== ""));
					setFadingFilters(new Set());
				}, 200);
			}
		}, 2000);
		return () => clearTimeout(timer);
	}, [filters, editingFilterIndex, onFiltersChange]);

	const addFilter = (label: string) => {
		setDraftFilter({ label, operator: "=", value: "" });
		setFilterOpen(false);
		setEditingFilterIndex(filters.length);
	};

	const updateDraft = (updates: Partial<Filter>) => {
		if (draftFilter) setDraftFilter({ ...draftFilter, ...updates });
		else if (editingFilterIndex !== null)
			setDraftFilter({ ...filters[editingFilterIndex], ...updates });
	};

	const commit = () => {
		if (draftFilter && editingFilterIndex !== null) {
			if (draftFilter.value.trim() !== "") {
				const next = [...filters];
				if (editingFilterIndex >= filters.length) next.push(draftFilter);
				else next[editingFilterIndex] = draftFilter;
				onFiltersChange(next);
			}
		}
		setDraftFilter(null);
		setEditingFilterIndex(null);
	};

	const remove = (index: number) => {
		onFiltersChange(filters.filter((_, i) => i !== index));
		if (editingFilterIndex === index) {
			setEditingFilterIndex(null);
			setDraftFilter(null);
		}
	};

	return (
		<div className="flex flex-wrap gap-1 items-center">
			{filters.map((filter, index) => {
				if (
					filter.value.trim() === "" &&
					editingFilterIndex !== index &&
					!fadingFilters.has(index)
				) {
					return null;
				}

				const isFading = fadingFilters.has(index);
				const currentFilter =
					editingFilterIndex === index && draftFilter ? draftFilter : filter;

				return (
					<Popover
						key={`${filter.label}-${index}`}
						open={editingFilterIndex === index}
						onOpenChange={(open) => {
							if (open) {
								setEditingFilterIndex(index);
								setDraftFilter(filter);
							} else {
								commit();
							}
						}}
					>
						<PopoverTrigger asChild>
							<Badge
								variant="secondary"
								className={cn(
									"gap-1 cursor-pointer hover:bg-secondary/80 transition-all duration-200 border-0 h-6 px-3",
									isFading && "opacity-0",
								)}
							>
								{filter.label} {filter.operator} {filter.value || '""'}
								<X
									className="h-3 w-3 cursor-pointer hover:text-destructive"
									onClick={(e) => {
										e.stopPropagation();
										remove(index);
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
											updateDraft({ operator: value as FilterOperator })
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
										onChange={(e) => updateDraft({ value: e.target.value })}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commit();
											}
										}}
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

			{/* Draft badge when adding */}
			{draftFilter &&
				editingFilterIndex !== null &&
				editingFilterIndex >= filters.length && (
					<Popover
						open={true}
						onOpenChange={(open) => {
							if (!open) commit();
						}}
					>
						<PopoverTrigger asChild>
							<Badge
								variant="secondary"
								className="gap-1 cursor-pointer hover:bg-secondary/80 transition-all duration-200 border-0 h-8 px-3"
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
											updateDraft({ operator: value as FilterOperator })
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
										onChange={(e) => updateDraft({ value: e.target.value })}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commit();
											}
										}}
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
					<Button
						variant="ghost"
						size="sm"
						className="justify-start text-sm text-muted-foreground"
					>
						<ListFilterPlus className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[300px] p-0" align="start">
					<Command>
						<CommandInput placeholder="Search labels..." />
						<CommandList>
							<CommandEmpty>No labels found.</CommandEmpty>
							<CommandGroup heading="Available Labels">
								{(availableLabels || []).map((label) => (
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
	);
}
