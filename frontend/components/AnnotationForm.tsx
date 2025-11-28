import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface AnnotationFormProps {
	emoji: string;
	setEmoji: (emoji: string) => void;
	title: string;
	setTitle: (title: string) => void;
	start: Date | undefined;
	setStart: (date: Date | undefined) => void;
	end: Date | undefined;
	setEnd: (date: Date | undefined) => void;
	isEditing?: boolean;
}

export function AnnotationForm({
	emoji,
	setEmoji,
	title,
	setTitle,
	start,
	setStart,
	end,
	setEnd,
	isEditing,
}: AnnotationFormProps) {
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

	// Common emojis for quick access
	const commonEmojis = ["🔥", "⚠️", "🚀", "🐛", "🔧", "📦"];

	return (
		<div className="space-y-2">
			{/* Emoji and Title - Same Line */}
			<div className="flex items-center gap-2">
				<Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="text-xl cursor-pointer transition-opacity flex-shrink-0 hover:bg-muted rounded-md p-1"
							onClick={() => setEmojiPickerOpen(true)}
						>
							{emoji}
						</button>
					</PopoverTrigger>
					<PopoverContent className="w-full p-1">
						<EmojiPicker
							onEmojiSelect={(emoji) => {
								setEmoji(emoji.emoji);
								setEmojiPickerOpen(false);
							}}
						>
							<EmojiPickerSearch placeholder="Search emoji..." />
							{/* Frequently Used Section */}

							<EmojiPickerContent className="max-h-[200px]" />

							<div className="border-t px-1 pb-0 pt-1">
								<div className="text-xs text-muted-foreground ml-1 mb-1">
									Frequently Used
								</div>
								<div className="flex flex-wrap gap-1">
									{commonEmojis.map((e) => (
										<button
											key={e}
											type="button"
											className="text-sm hover:bg-muted rounded-sm p-1 transition-colors"
											onClick={() => {
												setEmoji(e);
												setEmojiPickerOpen(false);
											}}
										>
											{e}
										</button>
									))}
								</div>
							</div>
						</EmojiPicker>
					</PopoverContent>
				</Popover>

				{/* Title - Borderless */}
				<Input
					id="title"
					placeholder={isEditing ? "Edit annotation" : "New annotation"}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="border-0 shadow-none px-0 focus-visible:ring-0 font-semibold text-lg md:text-lg flex-1 placeholder:text-secondary-foreground/60 h-auto"
				/>
			</div>

			{/* Start Date */}
			<div className="space-y-2">
				<Label className="text-xs">Start Date</Label>
				<DateTimePicker
					date={start}
					setDate={setStart}
					buttonClassName="w-full"
				/>
			</div>

			{/* End Date */}
			<div className="space-y-2 mb-3">
				<Label className="text-xs">End Date</Label>
				<DateTimePicker date={end} setDate={setEnd} buttonClassName="w-full" />
			</div>
		</div>
	);
}
