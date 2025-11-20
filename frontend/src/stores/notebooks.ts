import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Flows } from "@/src/services/api/flows";
import { Metrics } from "@/src/services/api/metrics";
import { Notebooks } from "@/src/services/api/notebooks";
import type { Filter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";
import type { Metric } from "@/src/types/metric";
import type { Notebook } from "@/src/types/notebook";

// Debounce timeout storage (outside of Zustand state)
let saveTimeout: NodeJS.Timeout | null = null;

interface NotebooksState {
	notebooks: Record<string, Notebook[]>; // Keyed by tenant
	currentNotebook: Notebook | null;
	flows: Flow[];
	flowsLoading: boolean;
	metrics: Metric[];
	metricsLoading: boolean;
	loading: boolean;
	error: string | null;
	settingsOpenBlockId: string | null;
	notebookCreating: boolean;
	setCurrentNotebook: (tenant: string, notebookId: string) => Notebook | null;
	openBlockSettings: (blockId: string) => void;
	closeBlockSettings: () => void;
	fetchNotebooks: (tenant: string) => Promise<void>;
	fetchFlows: (
		tenant: string,
		start: Date,
		end: Date,
		filters: Filter[],
	) => Promise<void>;
	fetchMetrics: () => Promise<void>;
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
}

export const useNotebooksStore = create<NotebooksState>()(
	devtools(
		(set, get) => ({
			notebooks: {},
			currentNotebook: null,
			notebookCreating: false,
			flows: [],
			flowsLoading: false,
			metrics: [],
			metricsLoading: false,
			loading: true,
			error: null,
			settingsOpenBlockId: null,

			openBlockSettings: (blockId: string) => {
				set({ settingsOpenBlockId: blockId });
			},
			closeBlockSettings: () => {
				set({ settingsOpenBlockId: null });
			},
			fetchFlows: async (
				tenant: string,
				start: Date,
				end: Date,
				filters: Filter[],
			) => {
				set({ flowsLoading: true });
				try {
					const flows = await Flows.getByTenant(tenant, start, end, filters);
					set({ flows, flowsLoading: false });
				} catch (error) {
					console.error("Failed to fetch flows:", error);
					set({ flows: [], flowsLoading: false });
				}
			},
			fetchMetrics: async () => {
				set({ metricsLoading: true });
				try {
					const response = await Metrics.list();
					set({ metrics: response, metricsLoading: false });
				} catch (error) {
					console.error("Failed to fetch metrics:", error);
					set({ metrics: [], metricsLoading: false });
				}
			},
			setCurrentNotebook: (tenant: string, notebookId: string) => {
				const currentNotebook =
					(get().notebooks[tenant] || []).find((nb) => nb.id === notebookId) ||
					null;
				if (!currentNotebook) return null;
				set({
					currentNotebook,
				});

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
		}),
		{ name: "notebooks" },
	),
);
