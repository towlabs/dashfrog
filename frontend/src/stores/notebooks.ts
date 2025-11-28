import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Comments } from "@/src/services/api/comments";
import { Flows } from "@/src/services/api/flows";
import { Metrics } from "@/src/services/api/metrics";
import { Notebooks } from "@/src/services/api/notebooks";
import type { Comment } from "@/src/types/comment";
import type { Filter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";
import type { InstantMetric, RangeMetric } from "@/src/types/metric";
import type { Notebook } from "@/src/types/notebook";
import { resolveTimeWindow } from "@/src/types/timewindow";

// Debounce timeout storage (outside of Zustand state)
let saveTimeout: NodeJS.Timeout | null = null;

// Time window refresh interval (outside of Zustand state)
let timeWindowInterval: NodeJS.Timeout | null = null;

interface NotebooksState {
	notebooks: Record<string, Notebook[]>; // Keyed by tenant
	currentNotebook: Notebook | null;
	flows: Flow[];
	flowsLoading: boolean;
	instantMetrics: InstantMetric[];
	rangeMetrics: RangeMetric[];
	metricsLoading: boolean;
	comments: Comment[];
	commentsLoading: boolean;
	commentsDrawerOpen: boolean;
	loading: boolean;
	error: string | null;
	settingsOpenBlockId: string | null;
	notebookCreating: boolean;
	startDate: Date | null;
	endDate: Date | null;
	setCurrentNotebook: (
		tenant: string,
		notebookId?: string,
		notebook?: Notebook,
	) => Notebook | null;
	openBlockSettings: (blockId: string) => void;
	closeBlockSettings: () => void;
	openCommentsDrawer: () => void;
	closeCommentsDrawer: () => void;
	toggleCommentsDrawer: () => void;
	fetchNotebooks: (tenant: string) => Promise<void>;
	fetchFlows: (
		tenant: string,
		start: Date,
		end: Date,
		filters: Filter[],
		notebookId: string,
	) => Promise<void>;
	fetchMetrics: () => Promise<void>;
	fetchComments: (notebookId: string) => Promise<void>;
	updateNotebook: (
		tenant: string,
		notebook: Notebook,
		updates: Partial<Notebook>,
	) => void;
	createNotebook: (
		tenant: string,
		notebook: Omit<Notebook, "id" | "timeWindow" | "filters">,
	) => Notebook;
	deleteNotebook: (tenant: string, notebookId: string) => Promise<void>;
	stopTimeWindowRefresh: () => void;
}

export const useNotebooksStore = create<NotebooksState>()(
	devtools(
		(set, get) => ({
			notebooks: {},
			currentNotebook: null,
			notebookCreating: false,
			flows: [],
			flowsLoading: false,
			instantMetrics: [],
			rangeMetrics: [],
			metricsLoading: false,
			comments: [],
			commentsLoading: false,
			commentsDrawerOpen: false,
			loading: true,
			error: null,
			settingsOpenBlockId: null,
			startDate: null,
			endDate: null,

			openBlockSettings: (blockId: string) => {
				set({ settingsOpenBlockId: blockId });
			},
			closeBlockSettings: () => {
				set({ settingsOpenBlockId: null });
			},
			openCommentsDrawer: () => {
				set({ commentsDrawerOpen: true });
			},
			closeCommentsDrawer: () => {
				set({ commentsDrawerOpen: false });
			},
			toggleCommentsDrawer: () => {
				set({ commentsDrawerOpen: !get().commentsDrawerOpen });
			},
			fetchFlows: async (
				tenant: string,
				start: Date,
				end: Date,
				filters: Filter[],
				notebookId: string,
			) => {
				set({ flowsLoading: true });
				try {
					const flows = await Flows.getByTenant(
						tenant,
						start,
						end,
						filters,
						notebookId,
					);
					set({ flows, flowsLoading: false });
				} catch (_) {
					set({ flows: [], flowsLoading: false });
				}
			},
			fetchMetrics: async () => {
				set({ metricsLoading: true });
				try {
					const { instant, range } = await Metrics.list();
					set({
						instantMetrics: instant,
						rangeMetrics: range,
						metricsLoading: false,
					});
				} catch (error) {
					console.error("Failed to fetch metrics:", error);
					set({ instantMetrics: [], rangeMetrics: [], metricsLoading: false });
				}
			},
			fetchComments: async (notebookId: string) => {
				set({ commentsLoading: true });
				try {
					const comments = await Comments.list(notebookId);
					set({ comments, commentsLoading: false });
				} catch (error) {
					console.error("Failed to fetch comments:", error);
					set({ comments: [], commentsLoading: false });
				}
			},
			setCurrentNotebook: (
				tenant: string,
				notebookId?: string,
				notebook?: Notebook,
			) => {
				const currentNotebook =
					notebook ||
					(get().notebooks[tenant] || []).find((nb) => nb.id === notebookId) ||
					null;
				if (!currentNotebook) return null;

				// Clear any existing interval
				if (timeWindowInterval) {
					clearInterval(timeWindowInterval);
				}

				// Helper to update dates based on time window
				const updateDates = () => {
					const notebook = get().currentNotebook;
					if (!notebook?.timeWindow) {
						set({ startDate: null, endDate: null });
						return;
					}
					const { start, end } = resolveTimeWindow(notebook.timeWindow);
					set({ startDate: start, endDate: end });
				};

				set({ currentNotebook });

				// Update immediately and start refresh interval (every 5s)
				updateDates();
				if (currentNotebook?.timeWindow?.type === "relative") {
					timeWindowInterval = setInterval(updateDates, 15000);
				}

				return currentNotebook;
			},
			fetchNotebooks: async (tenant: string) => {
				set({ loading: true, error: null });
				try {
					const notebooksList = await Notebooks.getAll(tenant);

					const { notebooks } = get();
					set({
						notebooks: {
							...notebooks,
							[tenant]: notebooksList,
						},
						loading: false,
					});
				} catch (error) {
					console.error("Failed to fetch notebooks:", error);
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to fetch notebooks",
						loading: false,
					});
				}
			},

			updateNotebook: (
				tenant: string,
				notebook: Notebook,
				updates: Partial<Notebook>,
			) => {
				const { notebooks } = get();
				const updatedNotebook = { ...notebook, ...updates };
				// Update local state immediately (optimistic update)
				const updatedNotebooks = (notebooks[tenant] || []).map((nb) =>
					nb.id === updatedNotebook.id ? updatedNotebook : nb,
				);
				if (updates.timeWindow) {
					const { start, end } = resolveTimeWindow(updates.timeWindow);
					set({ startDate: start, endDate: end });
				}
				set({
					notebooks: {
						...notebooks,
						[tenant]: updatedNotebooks,
					},
					currentNotebook: updatedNotebook,
				});

				// Clear existing timeout
				if (saveTimeout) {
					clearTimeout(saveTimeout);
				}

				// Debounced API call
				saveTimeout = setTimeout(async () => {
					await Notebooks.update(updatedNotebook);
				}, 200);
			},

			createNotebook: (tenant: string, notebook: Notebook): Notebook => {
				const { notebooks } = get();
				const tenantNotebooks = notebooks[tenant] || [];

				// Generate UUID upfront

				// Update state immediately with loading = true
				set({
					notebookCreating: true,
					notebooks: {
						...notebooks,
						[tenant]: [...tenantNotebooks, notebook],
					},
				});

				// Call API in background
				Notebooks.create(tenant, notebook).then(() => {
					set({ notebookCreating: false });
				});

				// Return immediately for navigation
				return notebook;
			},

			deleteNotebook: async (tenant: string, notebookId: string) => {
				Notebooks.delete(notebookId);

				const { notebooks } = get();
				const tenantNotebooks = notebooks[tenant] || [];

				set({
					notebooks: {
						...notebooks,
						[tenant]: tenantNotebooks.filter((nb) => nb.id !== notebookId),
					},
				});
			},

			stopTimeWindowRefresh: () => {
				if (timeWindowInterval) {
					clearInterval(timeWindowInterval);
					timeWindowInterval = null;
				}
			},
		}),
		{ name: "notebooks" },
	),
);
