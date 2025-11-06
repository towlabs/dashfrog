"use client";

import { Badge } from "@/components/ui/badge";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

type LabelBadgeProps = {
	labelKey: string;
	labelValue: string;
	onAddFilter?: (key: string, value: string) => void;
};

export function LabelBadge({
	labelKey,
	labelValue,
	onAddFilter,
}: LabelBadgeProps) {
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
