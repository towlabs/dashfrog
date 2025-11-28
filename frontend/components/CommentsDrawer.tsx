import React from "react";
import { X } from "lucide-react";
import { Comment } from "@/components/Comment";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Comment as CommentType } from "@/src/types/comment";

interface CommentsDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	comments: CommentType[];
	loading: boolean;
}

export function CommentsDrawer({
	open,
	onOpenChange,
	comments,
	loading,
}: CommentsDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[400px] sm:w-[500px] p-0">
				<div className="flex flex-col h-full">
					{/* Header */}
					<div className="flex items-center justify-between p-6 pb-4 border-b">
						<SheetHeader className="flex-1">
							<SheetTitle className="text-left">
								Comments ({loading ? "..." : comments.length})
							</SheetTitle>
						</SheetHeader>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onOpenChange(false)}
							className="h-8 w-8"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{/* Content */}
					<ScrollArea className="flex-1 px-6">
						<div className="py-4 space-y-3">
							{loading && (
								<>
									{[...Array(5)].map((_, i) => (
										<div key={i} className="space-y-2">
											<Skeleton className="h-20 w-full" />
										</div>
									))}
								</>
							)}

							{!loading && comments.length === 0 && (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<p className="text-muted-foreground text-sm">
										No comments yet
									</p>
									<p className="text-muted-foreground text-xs mt-1">
										Comments will appear here when added
									</p>
								</div>
							)}

							{!loading &&
								comments.map((comment) => (
									<Comment key={comment.id} comment={comment} />
								))}
						</div>
					</ScrollArea>
				</div>
			</SheetContent>
		</Sheet>
	);
}
