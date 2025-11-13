"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { Clock } from "lucide-react";
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
	const editor = useCreateBlockNote({
		initialContent: undefined,
		default: "Write or press '/' for commands",
	});

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
					<Clock className="h-4 w-4" />
					{formatTimeAgo(event.eventDt)}
				</div>

				<SheetHeader>
					<div className="text-5xl mb-3">{event.emoji}</div>
					<SheetTitle>
						<h1 className="text-2xl font-bold">{event.name}</h1>
					</SheetTitle>
					<SheetDescription className="flex items-center gap-2 flex-wrap">
						{Object.entries(event.labels).map(([key, value]) => (
							<LabelBadge key={key} labelKey={key} labelValue={value} />
						))}
					</SheetDescription>
				</SheetHeader>

				{/* Separator */}
				<div className="my-6">
					<Separator />
				</div>

				{/* BlockNote Editor */}
				<div>
					<BlockNoteView editor={editor} theme="light" />
				</div>
			</SheetContent>
		</Sheet>
	);
}
