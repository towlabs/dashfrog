import type { Block } from "@blocknote/core";
import { Lock, Unlock } from "lucide-react";
import { useCallback, useEffect } from "react";
import ClientBlockNote from "@/components/ClientBlockNote";
import {
	type TimeWindow,
	TimeWindowSelector,
} from "@/components/TimeWindowSelector";
import { Button } from "@/components/ui/button";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type {
	NotebookDataWithContent,
	TimeWindowConfig,
} from "@/src/types/notebook";
import { ShareNotebook } from "./ShareNotebook";

interface NotebookProps {
	notebookUuid: string;
	isView?: boolean;
}

export default function Notebook({
	notebookUuid,
	isView = false,
}: NotebookProps) {
	// Get current notebook, time window, and actions from Zustand
	const notebook = useNotebooksStore((state) => state.currentNotebook);
	const timeWindow = useNotebooksStore((state) => state.currentTimeWindow);
	const fetchNotebook = useNotebooksStore((state) => state.fetchNotebook);
	const updateNotebook = useNotebooksStore((state) => state.updateNotebook);

	// Fetch notebook when UUID changes
	// Store automatically resolves time window and sets up interval
	useEffect(() => {
		void fetchNotebook(notebookUuid);
	}, [notebookUuid, fetchNotebook]);

	/**
	 * Unified update handler for all notebook changes
	 * Zustand handles immediate state update and debounced backend sync
	 */
	const handleNotebookUpdate = useCallback(
		(updates: Partial<NotebookDataWithContent>) => {
			if (!notebook) return;
			updateNotebook(notebook.uuid, updates);
		},
		[notebook, updateNotebook],
	);

	// Individual field handlers
	const handleTitleChange = useCallback(
		(title: string) => {
			handleNotebookUpdate({ title });
		},
		[handleNotebookUpdate],
	);

	const handleDescriptionChange = useCallback(
		(description: string) => {
			handleNotebookUpdate({ description });
		},
		[handleNotebookUpdate],
	);

	const handleBlocksChange = useCallback(
		(blocks: Block[]) => {
			const blocknoteUuid = notebook?.blocknote.uuid;
			if (!blocknoteUuid) return;
			handleNotebookUpdate({
				blocknote: {
					uuid: blocknoteUuid,
					content: blocks,
				},
			});
		},
		[handleNotebookUpdate, notebook?.blocknote.uuid],
	);

	const handleTimeWindowChange = useCallback(
		(_timeWindow: TimeWindow, config: TimeWindowConfig) => {
			// Store will automatically resolve and set up interval
			handleNotebookUpdate({ timeWindow: config });
		},
		[handleNotebookUpdate],
	);

	const handleLockToggle = useCallback(() => {
		if (!notebook) return;
		handleNotebookUpdate({ locked: !notebook.locked });
	}, [notebook, handleNotebookUpdate]);

	// Show loading state
	if (!notebook) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">Loading notebook...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header with time window and share */}
			<div className="bg-background px-6 py-4">
				<div className="flex items-center justify-between">
					{/* Left group: Lock/Unlock */}
					{!isView && (
						<div className="flex items-center gap-3">
							<Button
								variant="ghost"
								size="sm"
								className="text-sm text-muted-foreground flex items-center gap-2"
								onClick={handleLockToggle}
							>
								{notebook.locked ? (
									<Lock className="h-4 w-4" />
								) : (
									<Unlock className="h-4 w-4" />
								)}
							</Button>
						</div>
					)}

					{/* Right group: Time window + Share */}
					<div className={`flex items-center gap-3 ${isView ? "ml-auto" : ""}`}>
						{timeWindow && (
							<TimeWindowSelector
								value={timeWindow}
								config={notebook.timeWindow}
								onChange={handleTimeWindowChange}
							/>
						)}
						{!isView && <ShareNotebook notebookId={notebook.uuid} />}
					</div>
				</div>
			</div>

			{/* Page content */}
			<div className="mx-auto max-w-6xl px-4 py-8">
				<div className="pl-8 md:pl-8">
					{/* Title */}
					<input
						value={notebook.title}
						onChange={(e) => handleTitleChange(e.target.value)}
						disabled={notebook.locked}
						className="w-full text-4xl font-bold border-none outline-none bg-transparent placeholder-muted-foreground disabled:opacity-100 disabled:cursor-default"
						placeholder="Untitled"
					/>

					{/* Description */}
					<textarea
						value={notebook.description ?? ""}
						onChange={(e) => handleDescriptionChange(e.target.value)}
						disabled={notebook.locked}
						className="mt-2 w-full resize-none border-none outline-none bg-transparent text-sm text-muted-foreground disabled:opacity-100 disabled:cursor-default"
						placeholder={notebook.locked ? "" : "Description..."}
						rows={2}
					/>
				</div>

				{/* Editor */}
				<div className="mt-6">
					<ClientBlockNote
						key={notebook.blocknote.uuid}
						readonly={notebook.locked}
						initialBlocks={notebook.blocknote.content}
						onBlocksChange={handleBlocksChange}
					/>
				</div>
			</div>
		</div>
	);
}
