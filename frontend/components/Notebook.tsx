import { useCallback, useEffect, useRef, useState } from "react";
import type { Block } from "@blocknote/core";
import { Lock, Unlock, AlertCircle, Check } from "lucide-react";
import { useBlocker } from "react-router-dom";
import ClientBlockNote from "@/components/ClientBlockNote";
import { EditorErrorBoundary } from "@/components/EditorErrorBoundary";
import {
	type TimeWindow,
	TimeWindowSelector,
} from "@/components/TimeWindowSelector";
import { Button } from "@/components/ui/button";
import { useNotebooks } from "@/src/contexts/notebooks";
import { Blocks } from "@/src/services/api/notebooks";
import {
	type NotebookData,
	type NotebookUpdateInput,
	resolveTimeWindow,
	type TimeWindowConfig,
} from "@/src/types/notebook";
import { ShareNotebook } from "./ShareNotebook";

interface NotebookProps {
	notebook: NotebookData | null;
	isLoading?: boolean;
	isView?: boolean;
	onUpdate?: () => void;
}

export default function Notebook({
	notebook,
	isLoading = false,
	isView = false,
	onUpdate,
}: NotebookProps) {
	const { updateNotebook: updateNotebookContext } = useNotebooks();
	const [blocks, setBlocks] = useState<Block[]>([]);
	const [blocksLoading, setBlocksLoading] = useState(true);

	// Track which block IDs exist on the backend
	const existingBlockIdsRef = useRef<Set<string>>(new Set());

	// Track previous blocks state to detect actual changes
	const previousBlocksRef = useRef<Block[]>([]);

	// Track pending blocks that haven't been saved yet (for Ctrl+S)
	const pendingBlocksRef = useRef<Block[] | null>(null);

	// Local state for title and description to prevent render interruption
	const [localTitle, setLocalTitle] = useState(notebook?.title || "");
	const [localDescription, setLocalDescription] = useState(notebook?.description || "");

	// Track unsaved changes
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [showSavedIndicator, setShowSavedIndicator] = useState(false);

	// Timeout refs for debouncing
	const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Unified debounce delay in ms (10 seconds to allow uninterrupted editing)
	// Applies to all edit operations: title, description, and block content
	const DEBOUNCE_DELAY = 10000;

	// Sync local state when notebook prop changes
	useEffect(() => {
		if (notebook) {
			setLocalTitle(notebook.title);
			setLocalDescription(notebook.description);
			setHasUnsavedChanges(false);
		}
	}, [notebook]);

	// Load blocks when notebook changes
	useEffect(() => {
		if (!notebook) {
			setBlocks([]);
			setBlocksLoading(false);
			existingBlockIdsRef.current = new Set();
			previousBlocksRef.current = [];
			pendingBlocksRef.current = null;
			return;
		}

		const loadBlocks = async () => {
			try {
				setBlocksLoading(true);
				const response = await Blocks.getAll(notebook.id);
				// Blocks are already sorted and in BlockNote format from API
				const sortedBlocks = response.data;

				// Track which blocks exist on the backend
				existingBlockIdsRef.current = new Set(
					response.data.map((b) => b.id)
				);

				// Store initial blocks as previous state for change detection
				// Deep clone to avoid reference issues
				previousBlocksRef.current = JSON.parse(JSON.stringify(sortedBlocks));
				// Clear any pending blocks on fresh load
				pendingBlocksRef.current = null;

				setBlocks(sortedBlocks);
			} catch (err) {
				console.error("Failed to load blocks:", err);
				setBlocks([]);
				existingBlockIdsRef.current = new Set();
				previousBlocksRef.current = [];
				pendingBlocksRef.current = null;
			} finally {
				setBlocksLoading(false);
			}
		};

		void loadBlocks();
	}, [notebook]);

	// Block navigation when there are unsaved changes
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			hasUnsavedChanges &&
			!isView &&
			currentLocation.pathname !== nextLocation.pathname,
	);

	// Warn user before closing/refreshing with unsaved changes
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges && !isView) {
				e.preventDefault();
				e.returnValue = "";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges, isView]);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
			if (descriptionTimeoutRef.current) clearTimeout(descriptionTimeoutRef.current);
			if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
		};
	}, []);

	/**
	 * Reference to current blocks for force save
	 */
	const currentBlocksRef = useRef<Block[]>(blocks);
	useEffect(() => {
		currentBlocksRef.current = blocks;
	}, [blocks]);

	/**
	 * Compare two blocks to check if they have changed
	 * Uses deep comparison of block content
	 */
	const hasBlockChanged = useCallback((newBlock: Block, oldBlock: Block | undefined): boolean => {
		if (!oldBlock) return true;

		// Compare using JSON stringification for deep equality
		// This checks type, props, content, and children
		return JSON.stringify(newBlock) !== JSON.stringify(oldBlock);
	}, []);

	/**
	 * Force save all pending changes immediately
	 * Called when user presses Ctrl/Cmd+S
	 */
	const forceSave = useCallback(async () => {
		if (!notebook || !hasUnsavedChanges || isView) return;

		// Clear all pending timeouts
		if (titleTimeoutRef.current) {
			clearTimeout(titleTimeoutRef.current);
			titleTimeoutRef.current = null;
		}
		if (descriptionTimeoutRef.current) {
			clearTimeout(descriptionTimeoutRef.current);
			descriptionTimeoutRef.current = null;
		}
		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current);
			updateTimeoutRef.current = null;
		}

		try {
			// Save title and description if they've changed
			if (localTitle !== notebook.title || localDescription !== notebook.description) {
				await updateNotebookContext(notebook.id, {
					title: localTitle,
					description: localDescription,
				});
			}

			// Force save blocks immediately
			// Use pending blocks if available (user typed but hasn't saved yet)
			// Otherwise use current saved blocks
			const currentBlocks = pendingBlocksRef.current || currentBlocksRef.current;
			const existingIds = existingBlockIdsRef.current;
			const previousBlocks = previousBlocksRef.current;
			const newBlockIds = new Set(currentBlocks.map((b) => b.id));

			console.log(`[Force Save] Using ${pendingBlocksRef.current ? 'pending' : 'current'} blocks: ${currentBlocks.length} blocks`);

			// Create a map of previous blocks for quick lookup
			const previousBlocksMap = new Map(
				previousBlocks.map((b) => [b.id, b])
			);

			// Identify operations needed
			const blocksToCreate = currentBlocks.filter((block) => !existingIds.has(block.id));
			const blockIdsToDelete = Array.from(existingIds).filter((id) => !newBlockIds.has(id));

			// Only update blocks that actually changed
			const blocksToUpdate = currentBlocks.filter((block) => {
				if (!existingIds.has(block.id)) return false;
				const previousBlock = previousBlocksMap.get(block.id);
				return hasBlockChanged(block, previousBlock);
			});

			// Execute creates
			for (let i = 0; i < blocksToCreate.length; i++) {
				const block = blocksToCreate[i];
				const position = currentBlocks.indexOf(block);
				await Blocks.create(notebook.id, block, position);
				existingIds.add(block.id);
			}

			// Execute deletes
			for (const blockId of blockIdsToDelete) {
				await Blocks.delete(notebook.id, blockId);
				existingIds.delete(blockId);
			}

			// Execute batch update for changed blocks only
			if (blocksToUpdate.length > 0) {
				const updatePayload = blocksToUpdate.map((block) => {
					const position = currentBlocks.indexOf(block);
					return {
						...block,
						position,
					};
				});
				await Blocks.updateBatch(notebook.id, updatePayload);
			}

			// Update previous blocks reference after successful save
			// Deep clone to avoid reference issues
			previousBlocksRef.current = JSON.parse(JSON.stringify(currentBlocks));
			// Clear pending blocks since they're now saved
			pendingBlocksRef.current = null;

			setHasUnsavedChanges(false);

			// Show saved indicator briefly
			setShowSavedIndicator(true);
			setTimeout(() => setShowSavedIndicator(false), 2000);

			console.log(`Manual save (Ctrl/Cmd+S): ${blocksToCreate.length} created, ${blocksToUpdate.length} updated, ${blockIdsToDelete.length} deleted`);
		} catch (err) {
			console.error("Failed to save changes:", err);
		}
	}, [notebook, hasUnsavedChanges, isView, localTitle, localDescription, updateNotebookContext, hasBlockChanged]);

	// Listen for Ctrl/Cmd+S to save
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Check for Ctrl+S (Windows/Linux) or Cmd+S (macOS)
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault(); // Prevent browser's default save dialog
				void forceSave();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [forceSave]);

	/**
	 * Handle block changes from BlockNote editor
	 * Debounced to avoid excessive API calls and allow uninterrupted typing
	 * Properly handles creating new blocks, updating existing ones, and deleting removed blocks
	 */
	const handleBlocksChange = useCallback(
		(newBlocks: Block[]) => {
			if (!notebook) return;

			// Store pending blocks for force save (Ctrl+S)
			pendingBlocksRef.current = newBlocks;

			// Mark as unsaved
			setHasUnsavedChanges(true);

			// Clear any existing timeout
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}

			// Debounce updates to allow uninterrupted typing
			updateTimeoutRef.current = setTimeout(() => {
				const syncBlocks = async () => {
					try {
						const existingIds = existingBlockIdsRef.current;
						const previousBlocks = previousBlocksRef.current;
						const newBlockIds = new Set(newBlocks.map((b) => b.id));

						console.log(`[Sync] Comparing ${newBlocks.length} blocks with ${previousBlocks.length} previous blocks`);

						// Create a map of previous blocks for quick lookup
						const previousBlocksMap = new Map(
							previousBlocks.map((b) => [b.id, b])
						);

						// 1. Identify new blocks (need to be created)
						const blocksToCreate = newBlocks.filter(
							(block) => !existingIds.has(block.id)
						);

						// 2. Identify deleted blocks (need to be deleted from backend)
						const blockIdsToDelete = Array.from(existingIds).filter(
							(id) => !newBlockIds.has(id)
						);

						// 3. Identify blocks that actually changed (not just exist)
						const blocksToUpdate = newBlocks.filter((block) => {
							// Only include blocks that exist on backend and have changed
							if (!existingIds.has(block.id)) return false;

							const previousBlock = previousBlocksMap.get(block.id);
							const changed = hasBlockChanged(block, previousBlock);
							if (changed) {
								console.log(`[Sync] Block ${block.id} changed`);
							}
							return changed;
						});

						console.log(`[Sync] Operations: ${blocksToCreate.length} create, ${blocksToUpdate.length} update, ${blockIdsToDelete.length} delete`);

						// Execute creates
						for (let i = 0; i < blocksToCreate.length; i++) {
							const block = blocksToCreate[i];
							const position = newBlocks.indexOf(block);
							await Blocks.create(notebook.id, block, position);
							// Add to existing set after successful create
							existingIds.add(block.id);
						}

						// Execute deletes
						for (const blockId of blockIdsToDelete) {
							await Blocks.delete(notebook.id, blockId);
							// Remove from existing set after successful delete
							existingIds.delete(blockId);
						}

						// Execute batch update for changed blocks only
						if (blocksToUpdate.length > 0) {
							const updatePayload = blocksToUpdate.map((block) => {
								const position = newBlocks.indexOf(block);
								return {
									...block,
									position,
								};
							});
							await Blocks.updateBatch(notebook.id, updatePayload);

							console.log(`Batch updated ${blocksToUpdate.length} changed block(s)`);
						}

						// Update local state and previous blocks reference
						setBlocks(newBlocks);
						// Deep clone to avoid reference issues with future comparisons
						previousBlocksRef.current = JSON.parse(JSON.stringify(newBlocks));
						// Clear pending blocks since they're now saved
						pendingBlocksRef.current = null;
						setHasUnsavedChanges(false);

						console.log(`Sync complete: ${blocksToCreate.length} created, ${blocksToUpdate.length} updated, ${blockIdsToDelete.length} deleted`);
					} catch (err) {
						console.error("Failed to sync blocks:", err);
					}
				};

				void syncBlocks();
			}, DEBOUNCE_DELAY);
		},
		[notebook, hasBlockChanged],
	);

	// Handlers to update notebook metadata
	const updateNotebook = useCallback(
		async (updates: NotebookUpdateInput) => {
			if (!notebook) return;

			try {
				await updateNotebookContext(notebook.id, updates);
				if (onUpdate) {
					onUpdate(); // Notify parent to refresh
				}
			} catch (err) {
				console.error("Failed to update notebook:", err);
			}
		},
		[notebook, updateNotebookContext, onUpdate],
	);

	const handleTitleChange = useCallback(
		(newTitle: string) => {
			if (!notebook) return;

			// Update local state immediately for responsive UI
			setLocalTitle(newTitle);
			setHasUnsavedChanges(true);

			// Clear any existing timeout
			if (titleTimeoutRef.current) {
				clearTimeout(titleTimeoutRef.current);
			}

			// Debounce the API call
			titleTimeoutRef.current = setTimeout(() => {
				const saveTitle = async () => {
					try {
						await updateNotebook({ title: newTitle });
						setHasUnsavedChanges(false);
					} catch (err) {
						console.error("Failed to update title:", err);
					}
				};
				void saveTitle();
			}, DEBOUNCE_DELAY);
		},
		[notebook, updateNotebook],
	);

	const handleDescriptionChange = useCallback(
		(newDescription: string) => {
			if (!notebook) return;

			// Update local state immediately for responsive UI
			setLocalDescription(newDescription);
			setHasUnsavedChanges(true);

			// Clear any existing timeout
			if (descriptionTimeoutRef.current) {
				clearTimeout(descriptionTimeoutRef.current);
			}

			// Debounce the API call
			descriptionTimeoutRef.current = setTimeout(() => {
				const saveDescription = async () => {
					try {
						await updateNotebook({ description: newDescription });
						setHasUnsavedChanges(false);
					} catch (err) {
						console.error("Failed to update description:", err);
					}
				};
				void saveDescription();
			}, DEBOUNCE_DELAY);
		},
		[notebook, updateNotebook],
	);

	const handleLockToggle = useCallback(() => {
		if (!notebook) return;
		void updateNotebook({ locked: !notebook.locked });
	}, [notebook, updateNotebook]);

	const handleTimeWindowChange = useCallback(
		(_timeWindow: TimeWindow, config: TimeWindowConfig) => {
			void updateNotebook({
				timeWindow: config,
			});
		},
		[updateNotebook],
	);

	// Compute time window with fallback
	const timeWindow = notebook?.timeWindow
		? resolveTimeWindow(notebook.timeWindow)
		: { start: new Date(), end: new Date() };

	// Show loading state
	if (isLoading || blocksLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">Loading notebook...</p>
				</div>
			</div>
		);
	}

	// Show 404 if notebook not found
	if (!notebook) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">Notebook not found</h1>
					<p className="text-muted-foreground">
						The notebook you're looking for doesn't exist.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Unsaved changes indicator */}
			{hasUnsavedChanges && !isView && !showSavedIndicator && (
				<div className="fixed top-4 right-4 z-50 bg-yellow-500/10 border border-yellow-500/50 text-yellow-700 dark:text-yellow-400 px-3 py-2 rounded-md flex items-center gap-2 text-sm">
					<AlertCircle className="h-4 w-4" />
					<span>Saving changes...</span>
				</div>
			)}

			{/* Saved indicator (shown after Ctrl/Cmd+S) */}
			{showSavedIndicator && !isView && (
				<div className="fixed top-4 right-4 z-50 bg-green-500/10 border border-green-500/50 text-green-700 dark:text-green-400 px-3 py-2 rounded-md flex items-center gap-2 text-sm">
					<Check className="h-4 w-4" />
					<span>Saved!</span>
				</div>
			)}

			{/* Navigation blocker dialog */}
			{blocker.state === "blocked" && (
				<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
					<div className="bg-background border rounded-lg p-6 max-w-md mx-4 shadow-lg">
						<h2 className="text-lg font-semibold mb-2">Unsaved Changes</h2>
						<p className="text-sm text-muted-foreground mb-4">
							You have unsaved changes that will be lost if you leave this page.
							Are you sure you want to continue?
						</p>
						<div className="flex gap-3 justify-end">
							<Button
								variant="outline"
								onClick={() => blocker.reset?.()}
							>
								Stay
							</Button>
							<Button
								variant="destructive"
								onClick={() => blocker.proceed?.()}
							>
								Leave
							</Button>
						</div>
					</div>
				</div>
			)}

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
						{!isView && <ShareNotebook notebookId={notebook.id} />}
					</div>
				</div>
			</div>

			{/* Page content */}
			<div className="mx-auto max-w-6xl px-4 py-8">
				<div className="pl-8 md:pl-8">
					{/* Title */}
					<input
						value={localTitle}
						onChange={(e) => handleTitleChange(e.target.value)}
						disabled={notebook.locked}
						className="w-full text-4xl font-bold border-none outline-none bg-transparent placeholder-muted-foreground disabled:opacity-100 disabled:cursor-default"
						placeholder="Untitled"
					/>

					{/* Description */}
					<textarea
						value={localDescription}
						onChange={(e) => handleDescriptionChange(e.target.value)}
						disabled={notebook.locked}
						className="mt-2 w-full resize-none border-none outline-none bg-transparent text-sm text-muted-foreground disabled:opacity-100 disabled:cursor-default"
						placeholder={notebook.locked ? "" : "Description..."}
						rows={2}
					/>
				</div>

				{/* Editor */}
				<div className="mt-6">
					<EditorErrorBoundary>
						<ClientBlockNote
							timeWindow={timeWindow}
							blockNoteId={notebook.blockNoteId}
							readonly={notebook.locked}
							initialBlocks={blocks}
							onBlocksChange={handleBlocksChange}
						/>
					</EditorErrorBoundary>
				</div>
			</div>
		</div>
	);
}
