import { uniq } from "lodash";
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
import type { Flow } from "@/src/types/flow";

interface FlowSelectorProps {
	flows: Flow[];
	selectedFlowName: string;
	onFlowSelect: (flowName: string) => void;
}

export function FlowSelector({
	flows,
	selectedFlowName,
	onFlowSelect,
}: FlowSelectorProps) {
	const [comboboxOpen, setComboboxOpen] = useState(false);

	if (flows.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">No flows available</div>
		);
	}

	const flowNames = uniq(flows.map((flow) => flow.name));

	return (
		<Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={comboboxOpen}
					className="w-full justify-between"
				>
					{selectedFlowName
						? flowNames.find((flowName) => flowName === selectedFlowName)
						: "Select a flow..."}
					<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[400px] p-0">
				<Command>
					<CommandInput placeholder="Search flows..." />
					<CommandList>
						<CommandEmpty>No flow found.</CommandEmpty>
						<CommandGroup>
							{flowNames.map((flowName) => (
								<CommandItem
									key={flowName}
									value={flowName}
									onSelect={(currentValue) => {
										onFlowSelect(
											currentValue === selectedFlowName ? "" : currentValue,
										);
										setComboboxOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											selectedFlowName === flowName
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									{flowName}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
