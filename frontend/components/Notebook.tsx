import type { Block } from "@blocknote/core";
import { Lock, Unlock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ClientBlockNote from "@/components/ClientBlockNote";
import {
	type TimeWindow,
	TimeWindowSelector,
} from "@/components/TimeWindowSelector";
import { Button } from "@/components/ui/button";
import { useNotebooks } from "@/src/contexts/notebooks";
import { Notebooks } from "@/src/services/api/notebooks";
import {
	type NotebookDataWithContent,
	resolveTimeWindow,
	type TimeWindowConfig,
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
	const { updateNotebook } = useNotebooks();
	const [notebook, setNotebook] = useState<NotebookDataWithContent | null>(
		null,
	);

	// Resolve time window and auto-refresh for relative windows
	const [timeWindow, setTimeWindow] = useState<TimeWindow>(() =>
		notebook
			? resolveTimeWindow(notebook.timeWindow)
			: { start: new Date(), end: new Date() },
	);

	useEffect(() => {
		if (!notebook) return;
		// Update time window when config changes
		setTimeWindow(resolveTimeWindow(notebook.timeWindow));

		// Only set up interval for relative time windows
		if (notebook.timeWindow.type !== "relative") {
			return;
		}

		// Re-evaluate relative time window every 10 seconds
		const intervalId = setInterval(() => {
			setTimeWindow(resolveTimeWindow(notebook.timeWindow));
		}, 10000);

		return () => clearInterval(intervalId);
	}, [notebook]);

	useEffect(() => {
		void (async () => {
			const fetchedNotebook = await Notebooks.get(notebookUuid);
			setNotebook(fetchedNotebook);
		})();
	}, [notebookUuid]);

	/**
	 * Unified update handler for all notebook changes
	 * Delegates to context which handles immediate state update and debounced backend sync
	 */
	const handleNotebookUpdate = useCallback(
		(updates: Partial<NotebookDataWithContent>) => {
			// Store the updated notebook in a variable
			let updatedNotebook: NotebookDataWithContent | null = null;

			// Use functional update to avoid stale closure issues
			setNotebook((prevNotebook) => {
				if (!prevNotebook) return prevNotebook;

				updatedNotebook = { ...prevNotebook, ...updates };
				return updatedNotebook;
			});

			// Call context update AFTER setState completes
			if (updatedNotebook) {
				updateNotebook(updatedNotebook.uuid, updatedNotebook);
			}
		},
		[updateNotebook],
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
		(timeWindow: TimeWindow, config: TimeWindowConfig) => {
			handleNotebookUpdate({ timeWindow: config });
			// Update resolved time window immediately
			setTimeWindow(timeWindow);
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
						<TimeWindowSelector
							value={timeWindow}
							config={notebook.timeWindow}
							onChange={handleTimeWindowChange}
						/>
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
						timeWindow={timeWindow}
						readonly={notebook.locked}
						initialBlocks={notebook.blocknote.content}
						onBlocksChange={handleBlocksChange}
					/>
				</div>
			</div>
		</div>
	);
}
