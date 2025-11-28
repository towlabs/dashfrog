import React from "react";
import { Comment } from "@/components/Comment";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Comment as CommentType } from "@/src/types/comment";

interface CommentsSideMenuProps {
	comments: CommentType[];
	visible: boolean;
	className?: string;
}

export function CommentsSideMenu({
	comments,
	visible,
	className,
}: CommentsSideMenuProps) {
	return (
		<div
			className={cn(
				"border-l bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
				visible ? "w-[400px]" : "w-0 border-l-0",
				className,
			)}
		>
			<div className="w-[400px] flex flex-col h-full">
				{/* Header */}
				<div className="p-6 pb-4">
					<h2 className="text-lg font-semibold">Comments</h2>
				</div>
				<Separator />

				{/* Content */}
				<ScrollArea className="flex-1">
					<div className="p-6 pt-4 space-y-3">
						{comments.length === 0 && (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<p className="text-muted-foreground text-sm">No comments yet</p>
								<p className="text-muted-foreground text-xs mt-1">
									Comments will appear here when added
								</p>
							</div>
						)}

						{comments.map((comment) => (
							<Comment key={comment.id} comment={comment} />
						))}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
