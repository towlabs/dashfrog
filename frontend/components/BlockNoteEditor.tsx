"use client";

import {
	Bold,
	Code,
	Heading1,
	Heading2,
	Italic,
	List,
	ListOrdered,
	Quote,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface NotionLikeEditorProps {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
}

export default function NotionLikeEditor({
	value = "",
	onChange,
	placeholder = "Type '/' for commands, or start writing...",
}: NotionLikeEditorProps) {
	const [content, setContent] = useState(value);
	const editorRef = useRef<HTMLDivElement>(null);
	const [showToolbar, setShowToolbar] = useState(false);

	const handleInput = useCallback(() => {
		if (editorRef.current) {
			const newContent = editorRef.current.innerHTML;
			setContent(newContent);
			if (onChange) {
				onChange(newContent);
			}
		}
	}, [onChange]);

	const executeCommand = (command: string, value?: string) => {
		document.execCommand(command, false, value);
		editorRef.current?.focus();
		handleInput();
	};

	const insertHeading = (level: number) => {
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const heading = document.createElement(`h${level}`);
			heading.textContent = "Heading";
			heading.style.fontWeight = "bold";
			heading.style.fontSize = level === 1 ? "1.5em" : "1.25em";
			heading.style.marginTop = "1em";
			heading.style.marginBottom = "0.5em";

			range.insertNode(heading);
			range.setStartAfter(heading);
			range.setEndAfter(heading);
			selection.removeAllRanges();
			selection.addRange(range);
		}
		editorRef.current?.focus();
		handleInput();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Show toolbar on selection
		if (e.key === "Escape") {
			setShowToolbar(false);
		}

		// Bold with Cmd/Ctrl + B
		if ((e.metaKey || e.ctrlKey) && e.key === "b") {
			e.preventDefault();
			executeCommand("bold");
		}

		// Italic with Cmd/Ctrl + I
		if ((e.metaKey || e.ctrlKey) && e.key === "i") {
			e.preventDefault();
			executeCommand("italic");
		}
	};

	const handleMouseUp = () => {
		const selection = window.getSelection();
		if (selection && selection.toString().length > 0) {
			setShowToolbar(true);
		} else {
			setShowToolbar(false);
		}
	};

	return (
		<div className="relative border rounded-lg min-h-[300px] bg-white">
			{/* Floating Toolbar */}
			{showToolbar && (
				<div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-white border rounded-lg shadow-lg p-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => executeCommand("bold")}
						className="h-8 w-8 p-0"
					>
						<Bold className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => executeCommand("italic")}
						className="h-8 w-8 p-0"
					>
						<Italic className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => insertHeading(1)}
						className="h-8 w-8 p-0"
					>
						<Heading1 className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => insertHeading(2)}
						className="h-8 w-8 p-0"
					>
						<Heading2 className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => executeCommand("insertUnorderedList")}
						className="h-8 w-8 p-0"
					>
						<List className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => executeCommand("insertOrderedList")}
						className="h-8 w-8 p-0"
					>
						<ListOrdered className="h-4 w-4" />
					</Button>
				</div>
			)}

			{/* Editor */}
			<div
				ref={editorRef}
				contentEditable
				onInput={handleInput}
				onKeyDown={handleKeyDown}
				onMouseUp={handleMouseUp}
				className="min-h-[300px] p-4 focus:outline-none text-sm leading-relaxed"
				style={{
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
				}}
				suppressContentEditableWarning={true}
				dangerouslySetInnerHTML={{ __html: content }}
			/>

			{/* Placeholder */}
			{!content && (
				<div className="absolute top-4 left-4 text-gray-400 pointer-events-none text-sm">
					{placeholder}
				</div>
			)}
		</div>
	);
}
