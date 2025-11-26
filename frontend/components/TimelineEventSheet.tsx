"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import type { Block } from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import {
	SideMenu,
	SideMenuController,
	type SideMenuProps,
	SuggestionMenuController,
	useEditorChange,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { CalendarIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
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
import { Timeline } from "@/src/services/api";
import type { TimelineEvent } from "@/src/types/timeline";
import { customEditor, getSlashMenuItems } from "@/src/utils/editor";
import { AddBlockButton } from "./ui/add-block";
import { DragHandleButton } from "./ui/drag-block";
import { SuggestionMenu } from "./ui/suggestion-menu";

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
	const [initialized, setInitialized] = useState(false);

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
				<DragHandleButton {...props} />
			</SideMenu>
		);
	}, []);

	// Save editor content changes (debounced in store)
	useEditorChange((editor) => {
		if (initialized && event) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			void Timeline.update(event, editor.document as Block[]);
		}
	}, editor);

	useEffect(() => {
		if (!event) return;
		const blocks =
			event.blocks ?? editor.tryParseMarkdownToBlocks(event?.markdown || "");
		setInitialized(false);
		editor.replaceBlocks(editor.document, blocks);
		setInitialized(true);
	}, [event, editor]);
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
					<BlockNoteView
						editor={editor}
						theme="light"
						sideMenu={false}
						slashMenu={false}
					>
						<SuggestionMenuController
							triggerCharacter="/"
							suggestionMenuComponent={SuggestionMenu}
							getItems={async (query: string) => {
								// Simple filter matching title/aliases like defaults
								const all = getSlashMenuItems(editor, []);
								const q = query.trim().toLowerCase();
								return q
									? all.filter(
											(i) =>
												i.title?.toLowerCase().includes(q) ||
												i.aliases?.some((a: string) => a.includes(q)),
										)
									: all;
							}}
						/>
						<SideMenuController sideMenu={customSideMenu} />
					</BlockNoteView>
				</div>
			</SheetContent>
		</Sheet>
	);
}
