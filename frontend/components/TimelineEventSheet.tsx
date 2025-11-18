"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import * as locales from "@blocknote/core/locales";
import {
	AddBlockButton,
	DragHandleButton,
	DragHandleMenu,
	SideMenu,
	SideMenuController,
	SideMenuProps,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { CalendarIcon } from "lucide-react";
import { useEffect } from "react";
import { LabelBadge } from "@/components/LabelBadge";
import { Separator } from "@/components/ui/separator";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { formatTimeAgo } from "@/src/lib/formatters";
import type { TimelineEvent } from "@/src/types/timeline";
import { customEditor } from "@/src/utils/editor";
import React from "react";

interface TimelineEventSheetProps {
	event: TimelineEvent | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function TimelineEventSheet({
	event,
	open,
	onOpenChange,
}: TimelineEventSheetProps) {
	// Create BlockNote editor instance
	const editor = customEditor({
		initialContent: undefined,
		placeholders: {
			...locales.en.placeholders,
			emptyDocument: "Write or press '/' for commands",
			default: "Write or press '/' for commands",
		},
	});

	const customSideMenu = React.useCallback((props: SideMenuProps) => {
		return (
			<SideMenu {...props}>
				<AddBlockButton {...props} />
				<DragHandleButton {...props} dragHandleMenu={DragHandleMenu} />
			</SideMenu>
		);
	}, []);

	useEffect(() => {
		const blocks = editor.tryParseMarkdownToBlocks(event?.markdown || "");
		if (!blocks) return;
		editor.replaceBlocks(editor.document, blocks);
	}, [event?.markdown, editor]);
	if (!event) return null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-4xl overflow-y-auto py-4">
				{/* Timestamp at top right */}
				<div className="flex items-center justify-end gap-1 text-s text-muted-foreground mb-4">
					<div className="justify-between text-sm text-muted-foreground flex items-center gap-0">
						<CalendarIcon className="mr-2 h-4 w-4" />
						{formatTimeAgo(event.eventDt)}
					</div>
				</div>

				<SheetHeader className="mx-13">
					<div className="text-3xl mb-1">{event.emoji}</div>
					<SheetTitle>
						<span className="text-2xl font-bold">{event.name}</span>
					</SheetTitle>
					<SheetDescription className="flex items-center gap-2 flex-wrap">
						{Object.entries(event.labels).map(([key, value]) => (
							<LabelBadge key={key} labelKey={key} labelValue={value} />
						))}
					</SheetDescription>
				</SheetHeader>

				{/* Separator */}
				<div className="my-6 mx-13">
					<Separator />
				</div>

				{/* BlockNote Editor */}
				<div>
					<BlockNoteView editor={editor} theme="light" sideMenu={false}>
						<SideMenuController sideMenu={customSideMenu} />
					</BlockNoteView>
				</div>
			</SheetContent>
		</Sheet>
	);
}
