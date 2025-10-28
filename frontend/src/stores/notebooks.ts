import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Notebooks, toNotebook } from "@/src/services/api/notebooks";
import type {
	NotebookData,
	NotebookDataWithContent,
} from "@/src/types/notebook";
import { resolveTimeWindow } from "@/src/types/notebook";

export interface TimeWindow {
	start: Date;
	end: Date;
	label?: string;
}

interface NotebooksStore {
	// State
	notebooks: NotebookData[];
	currentNotebook: NotebookDataWithContent | null;
	currentTimeWindow: TimeWindow | null;
	isLoading: boolean;
	error: string | null;

	// Debounce tracking (not reactive, just internal state)
	_pendingUpdates: Map<string, Partial<NotebookDataWithContent>>;
	_updateTimers: Map<string, NodeJS.Timeout>;
	_timeWindowInterval: NodeJS.Timeout | null;

	// Actions
	fetchNotebooks: () => Promise<void>;
	fetchNotebook: (uuid: string) => Promise<void>;
	createNotebook: () => Promise<NotebookData>;
	updateNotebook: (
		uuid: string,
		updates: Partial<NotebookDataWithContent>,
	) => void;
	deleteNotebook: (uuid: string) => Promise<void>;
	clearCurrentNotebook: () => void;
	setCurrentTimeWindow: (timeWindow: TimeWindow | null) => void;
}

export const useNotebooksStore = create<NotebooksStore>()(
	devtools(
		(set, get) => ({
			// Initial state
			notebooks: [],
			currentNotebook: null,
			currentTimeWindow: null,
			isLoading: false,
			error: null,
			_pendingUpdates: new Map(),
			_updateTimers: new Map(),
			_timeWindowInterval: null,

			/**
			 * Fetch all notebooks for the sidebar
			 */
			fetchNotebooks: async () => {
				set({ isLoading: true, error: null });
				try {
					const response = await Notebooks.getAll();
					const notebooksData = response.data.map(toNotebook);
					set({ notebooks: notebooksData, isLoading: false });
				} catch (err) {
					console.error("Failed to fetch notebooks:", err);
					set({ error: "Failed to load notebooks", isLoading: false });
				}
			},

			/**
			 * Fetch a specific notebook with full content
			 * Automatically resolves time window and sets up auto-refresh for relative windows
			 */
			fetchNotebook: async (uuid: string) => {
				set({ isLoading: true, error: null });
				try {
					const notebook = await Notebooks.get(uuid);

					// Resolve initial time window
					const resolvedTimeWindow = resolveTimeWindow(notebook.timeWindow);

					set({
						currentNotebook: notebook,
						currentTimeWindow: resolvedTimeWindow,
						isLoading: false
					});

					// Clear any existing interval
					const { _timeWindowInterval } = get();
					if (_timeWindowInterval) {
						clearInterval(_timeWindowInterval);
					}

					// Set up auto-refresh for relative time windows
					if (notebook.timeWindow.type === "relative") {
						const intervalId = setInterval(() => {
							const { currentNotebook } = get();
							if (currentNotebook) {
								const newTimeWindow = resolveTimeWindow(currentNotebook.timeWindow);
								set({ currentTimeWindow: newTimeWindow });
							}
						}, 10000);

						set({ _timeWindowInterval: intervalId });
					}
				} catch (err) {
					console.error("Failed to fetch notebook:", err);
					set({
						error: "Failed to load notebook",
						currentNotebook: null,
						currentTimeWindow: null,
						isLoading: false,
					});
				}
			},

			/**
			 * Create a new notebook
			 */
			createNotebook: async () => {
				try {
					const notebook: NotebookData = {
						uuid: uuidv4(),
						title: "Untitled",
						description: null,
						locked: false,
						timeWindow: {
							type: "relative",
							metadata: { value: "24h" },
						},
					};

					// Optimistically add to list
					set((state) => ({
						notebooks: [notebook, ...state.notebooks],
					}));

					await Notebooks.create(notebook);
					return notebook;
				} catch (err) {
					console.error("Failed to create notebook:", err);
					set({ error: "Failed to create notebook" });
					throw err;
				}
			},

			/**
			 * Update a notebook
			 * - Updates currentNotebook immediately for instant UI feedback
			 * - Updates notebooks list if the notebook exists there
			 * - Re-resolves time window if timeWindow config changed
			 * - Accumulates changes and debounces backend sync (500ms)
			 */
			updateNotebook: (uuid: string, updates: Partial<NotebookDataWithContent>) => {
				const { _pendingUpdates, _updateTimers, _timeWindowInterval, currentNotebook } = get();

				// Accumulate updates
				const existingPending = _pendingUpdates.get(uuid) || {};
				const mergedUpdates = { ...existingPending, ...updates };
				_pendingUpdates.set(uuid, mergedUpdates);

				// Update current notebook immediately (if it's the one being edited)
				set((state) => {
					const updatedState: Partial<NotebooksStore> = {};

					// Update currentNotebook if this is the one being edited
					if (state.currentNotebook?.uuid === uuid) {
						updatedState.currentNotebook = {
							...state.currentNotebook,
							...updates,
						};
					}

					// Update notebooks list (for sidebar)
					// Extract non-NotebookData fields like blocknote
					const { blocknote: _blocknote, ...notebookFields } = updates as Record<
						string,
						unknown
					>;
					updatedState.notebooks = state.notebooks.map((nb) =>
						nb.uuid === uuid ? { ...nb, ...notebookFields } : nb,
					);

					return updatedState;
				});

				// If timeWindow config changed, re-resolve and update interval
				if (updates.timeWindow && currentNotebook?.uuid === uuid) {
					const newTimeWindow = resolveTimeWindow(updates.timeWindow);
					set({ currentTimeWindow: newTimeWindow });

					// Clear existing interval
					if (_timeWindowInterval) {
						clearInterval(_timeWindowInterval);
						set({ _timeWindowInterval: null });
					}

					// Set up new interval for relative time windows
					if (updates.timeWindow.type === "relative") {
						const intervalId = setInterval(() => {
							const { currentNotebook } = get();
							if (currentNotebook) {
								const refreshedTimeWindow = resolveTimeWindow(currentNotebook.timeWindow);
								set({ currentTimeWindow: refreshedTimeWindow });
							}
						}, 10000);

						set({ _timeWindowInterval: intervalId });
					}
				}

				// Clear existing timer
				const existingTimer = _updateTimers.get(uuid);
				if (existingTimer) {
					clearTimeout(existingTimer);
				}

				// Debounce backend sync (500ms)
				const timer = setTimeout(async () => {
					const accumulatedUpdates = _pendingUpdates.get(uuid);
					if (accumulatedUpdates) {
						try {
							await Notebooks.update(uuid, accumulatedUpdates);
							_pendingUpdates.delete(uuid);
						} catch (err) {
							console.error("Failed to update notebook:", err);
							set({ error: "Failed to update notebook" });
							// Keep pending updates on error for potential retry
						}
					}
					_updateTimers.delete(uuid);
				}, 500);

				_updateTimers.set(uuid, timer);
			},

			/**
			 * Delete a notebook
			 */
			deleteNotebook: async (uuid: string) => {
				try {
					await Notebooks.delete(uuid);

					// Update state
					set((state) => ({
						notebooks: state.notebooks.filter((nb) => nb.uuid !== uuid),
						currentNotebook:
							state.currentNotebook?.uuid === uuid
								? null
								: state.currentNotebook,
					}));
				} catch (err) {
					console.error("Failed to delete notebook:", err);
					set({ error: "Failed to delete notebook" });
					throw err;
				}
			},

			/**
			 * Clear the current notebook and cleanup interval
			 */
			clearCurrentNotebook: () => {
				const { _timeWindowInterval } = get();
				if (_timeWindowInterval) {
					clearInterval(_timeWindowInterval);
				}
				set({
					currentNotebook: null,
					currentTimeWindow: null,
					_timeWindowInterval: null
				});
			},

			/**
			 * Set the current time window
			 */
			setCurrentTimeWindow: (timeWindow: TimeWindow | null) => {
				set({ currentTimeWindow: timeWindow });
			},
		}),
		{ name: "NotebooksStore" },
	),
);
