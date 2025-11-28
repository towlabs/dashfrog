import { Trash2 } from "lucide-react";
import { useState } from "react";
import { AnnotationForm } from "@/components/AnnotationForm";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BaseComment, Comment as CommentModel } from "@/src/types/comment";

interface CommentProps {
	comment: BaseComment | CommentModel;
	className?: string;
	onDelete?: (id: number) => void;
	onUpdate?: (data: {
		id?: number;
		emoji: string;
		title: string;
		start: Date;
		end: Date;
	}) => Promise<void>;
}

function formatDateRange(start: Date, end: Date): string {
	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	const startDate = formatDate(start);
	const endDate = formatDate(end);
	const startTime = formatTime(start);
	const endTime = formatTime(end);

	// If same day, show: "Jan 15, 2024 at 2:00 PM - 4:00 PM"
	if (startDate === endDate) {
		return `${startDate} at ${startTime} - ${endTime}`;
	}

	// If different days, show: "Jan 15, 2024 2:00 PM - Jan 16, 2024 4:00 PM"
	return `${startDate} ${startTime} - ${endDate} ${endTime}`;
}

export function Comment({
	comment,
	className,
	onDelete,
	onUpdate,
}: CommentProps) {
	const isComment = (
		comment: BaseComment | CommentModel,
	): comment is CommentModel => {
		return "id" in comment;
	};

	const [open, setOpen] = useState(false);
	const [emoji, setEmoji] = useState(comment.emoji);
	const [title, setTitle] = useState(comment.title);
	const [start, setStart] = useState<Date | undefined>(comment.start);
	const [end, setEnd] = useState<Date | undefined>(comment.end);

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (newOpen) {
			// Populate form with comment data when opening
			setEmoji(comment.emoji);
			setTitle(comment.title);
			setStart(comment.start);
			setEnd(comment.end);
		} else {
			handleSave();
		}
	};

	const handleSave = async () => {
		if (!title || !start || !end || !onUpdate) return;

		await onUpdate({
			...(isComment(comment) && { id: comment.id }),
			emoji,
			title,
			start,
			end,
		});

		setOpen(false);
	};

	const commentContent = (
		<div
			className={cn(
				"cursor-pointer relative group transition-colors hover:bg-muted/50 py-3 px-4",
				className,
			)}
		>
			<div className="flex items-start gap-3">
				{/* Emoji */}
				<div className="text-2xl flex-shrink-0">{comment.emoji}</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					{/* Title */}
					<div className="font-medium text-sm mb-1 truncate">
						{comment.title}
					</div>

					{/* Date Range */}
					<div className="text-xs text-muted-foreground">
						{formatDateRange(comment.start, comment.end)}
					</div>
				</div>
			</div>

			{/* Delete Button - appears on hover */}
			{onDelete && (
				<Tooltip>
					<TooltipTrigger asChild>
						{isComment(comment) && (
							<div
								className="absolute right-4 top-3 px-2 py-1 rounded-md bg-background group-hover:opacity-100 transition-opacity cursor-pointer z-10 flex items-center gap-1 opacity-0"
								onClick={(e) => {
									e.stopPropagation();
									onDelete(comment.id);
								}}
							>
								<Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
							</div>
						)}
					</TooltipTrigger>
					<TooltipContent>
						<p>Delete comment</p>
					</TooltipContent>
				</Tooltip>
			)}
		</div>
	);

	// If it's a full comment with ID and we have onUpdate, wrap in popover
	if (isComment(comment) && onUpdate) {
		return (
			<Popover open={open} onOpenChange={handleOpenChange}>
				<PopoverTrigger asChild>{commentContent}</PopoverTrigger>
				<PopoverContent
					className="w-[405px]"
					side="bottom"
					align="start"
					sideOffset={-65}
				>
					<AnnotationForm
						emoji={emoji}
						setEmoji={setEmoji}
						title={title}
						setTitle={setTitle}
						start={start}
						setStart={setStart}
						end={end}
						setEnd={setEnd}
						isEditing={true}
					/>
				</PopoverContent>
			</Popover>
		);
	}

	// Otherwise just return the content
	return commentContent;
}
