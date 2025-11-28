import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Comment as CommentModel } from "@/src/types/comment";

interface CommentProps {
	comment: CommentModel;
	className?: string;
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

export function Comment({ comment, className }: CommentProps) {
	return (
		<Card
			className={cn(
				"hover:shadow-md transition-shadow cursor-pointer border-l-4",
				className,
			)}
		>
			<CardContent className="p-3">
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
			</CardContent>
		</Card>
	);
}
