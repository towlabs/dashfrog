import { useState } from "react";
import { Plus } from "lucide-react";
import { AnnotationForm } from "@/components/AnnotationForm";
import { Comment } from "@/components/Comment";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useNotebooksStore } from "@/src/stores/notebooks";

interface CommentsSideMenuProps {
	visible: boolean;
	className?: string;
}

export function CommentsSideMenu({
	visible,
	className,
}: CommentsSideMenuProps) {
	const deleteComment = useNotebooksStore((state) => state.deleteComment);
	const createComment = useNotebooksStore((state) => state.createComment);
	const updateComment = useNotebooksStore((state) => state.updateComment);
	const pendingComment = useNotebooksStore((state) => state.pendingComment);
	const comments = useNotebooksStore((state) => state.comments);

	const [open, setOpen] = useState(false);
	const [emoji, setEmoji] = useState("📝");
	const [title, setTitle] = useState("");
	const [start, setStart] = useState<Date | undefined>(new Date());
	const [end, setEnd] = useState<Date | undefined>(new Date());

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (newOpen) {
			// Reset form for new annotation
			setEmoji("📝");
			setTitle("");
			setStart(new Date());
			setEnd(new Date());
		} else {
			handleCreate();
		}
	};

	const handleCreate = async () => {
		if (!title || !start || !end) return;

		await createComment({
			emoji,
			title,
			start,
			end,
		});

		setOpen(false);
	};

	const handleUpdate = async (data: {
		id?: number;
		emoji: string;
		title: string;
		start: Date;
		end: Date;
	}) => {
		if (data.id !== undefined) {
			await updateComment({
				id: data.id,
				emoji: data.emoji,
				title: data.title,
				start: data.start,
				end: data.end,
			});
		}
	};

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
				<div className="py-2 px-6 flex items-center justify-between text-muted-foreground">
					<h3>Time annotations</h3>
					<Popover open={open} onOpenChange={handleOpenChange}>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="icon" className="cursor-pointer">
								<Plus className="size-5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[405px]" align="start">
							<AnnotationForm
								emoji={emoji}
								setEmoji={setEmoji}
								title={title}
								setTitle={setTitle}
								start={start}
								setStart={setStart}
								end={end}
								setEnd={setEnd}
								isEditing={false}
							/>
						</PopoverContent>
					</Popover>
				</div>
				<Separator />

				{/* Content */}
				<ScrollArea className="flex-1">
					<div className="divide-y">
						{comments.map((comment) => (
							<Comment
								key={comment.id}
								comment={comment}
								onDelete={deleteComment}
								onUpdate={handleUpdate}
							/>
						))}

						{pendingComment && (
							<Comment comment={pendingComment} onDelete={deleteComment} />
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
