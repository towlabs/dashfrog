import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
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

export type MultiSelectOption = {
	value: string;
	label: string;
};

interface MultiSelectProps {
	options: MultiSelectOption[];
	value: string[];
	onChange: (nextValues: string[]) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	className?: string;
	maxDisplayed?: number;
	disabled: boolean;
}

export function MultiSelect({
	options,
	value,
	onChange,
	placeholder = "Select...",
	searchPlaceholder = "Search...",
	className,
	maxDisplayed = 2,
	disabled = false,
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);

	const valueSet = React.useMemo(() => new Set(value), [value]);

	const selectedLabels = React.useMemo(() => {
		const labels = options
			.filter((o) => valueSet.has(o.value))
			.map((o) => o.label);
		if (labels.length <= maxDisplayed) return labels.join(", ");
		const shown = labels.slice(0, maxDisplayed).join(", ");
		return `${shown} +${labels.length - maxDisplayed}`;
	}, [options, valueSet, maxDisplayed]);

	function toggle(val: string) {
		const next = new Set(value);
		if (next.has(val)) {
			next.delete(val);
		} else {
			next.add(val);
		}
		onChange(Array.from(next));
	}

	function clearAll(e: React.MouseEvent) {
		e.stopPropagation();
		onChange([]);
	}

	return (
		<Popover open={open} onOpenChange={setOpen} modal={true}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
						className,
					)}
					disabled={disabled}
				>
					<span
						className={cn(
							"line-clamp-1 text-left",
							value.length === 0 && "text-muted-foreground",
						)}
					>
						{value.length === 0 ? placeholder : selectedLabels}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0 w-[280px]" align="start">
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandList>
						<CommandGroup>
							{options.map((opt) => {
								const checked = valueSet.has(opt.value);
								return (
									<CommandItem
										key={opt.value}
										onSelect={() => toggle(opt.value)}
									>
										<span>{opt.label}</span>
										{checked ? <Check className="ml-auto h-4 w-4" /> : null}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
				{value.length > 0 ? (
					<div className="border-t p-2">
						<Button variant="ghost" size="sm" onClick={clearAll}>
							Clear selection
						</Button>
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
