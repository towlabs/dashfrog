"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import React from "react";

type LabelBadgeProps = {
	labelKey: string;
	labelValue: string;
	onAddFilter?: (key: string, value: string) => void;
	readonly?: boolean;
	availableValues?: string[];
	onValueChange?: (value: string) => void;
	onRemove?: () => void;
};

export function LabelBadge({
	labelKey,
	labelValue,
	onAddFilter,
	readonly = true,
	availableValues,
	onValueChange,
	onRemove,
}: LabelBadgeProps) {
	const [isEditing, setIsEditing] = React.useState(
		() => !readonly && !labelValue,
	);

	// Editable mode with value selection
	if (!readonly && availableValues && onValueChange) {
		return (
			<Popover
				open={isEditing}
				onOpenChange={(open: boolean) => {
					setIsEditing(open);
					if (!labelValue && !open) {
						onValueChange(labelValue);
					}
				}}
			>
				<PopoverTrigger asChild>
					<Badge
						variant="secondary"
						className="gap-1 cursor-pointer hover:bg-secondary/80 transition-all duration-200 border-0 h-6 px-3 text-muted-foreground"
					>
						{labelKey}
						{labelValue && `: ${labelValue}`}
						{onRemove && (
							<X
								className="h-3 w-3 cursor-pointer hover:text-destructive"
								onClick={(e) => {
									e.stopPropagation();
									onRemove();
								}}
							/>
						)}
					</Badge>
				</PopoverTrigger>
				<PopoverContent className="w-[200px] p-0" align="start">
					<Command>
						<CommandInput placeholder="Search values..." />
						<CommandList className="max-h-[200px]">
							<CommandEmpty>No values found.</CommandEmpty>
							<CommandGroup>
								{availableValues.map((val) => (
									<CommandItem
										key={val}
										value={val}
										onSelect={() => {
											setIsEditing(false);
											onValueChange(val);
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
	}

	// Read-only mode with context menu
	return (
		<ContextMenu>
			<ContextMenuTrigger>
				<Badge
					variant="secondary"
					className="h-5 px-2 text-xs font-normal border-0 text-muted-foreground"
				>
					{labelKey}={labelValue}
				</Badge>
			</ContextMenuTrigger>
			{onAddFilter && (
				<ContextMenuContent>
					<ContextMenuItem onClick={() => onAddFilter(labelKey, labelValue)}>
						Add to filters
					</ContextMenuItem>
				</ContextMenuContent>
			)}
		</ContextMenu>
	);
}
