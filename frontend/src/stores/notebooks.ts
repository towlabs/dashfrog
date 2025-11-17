import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Notebooks } from "@/src/services/api/notebooks";
import { Flows, toFlow } from "@/src/services/api/flows";
import { Metrics } from "@/src/services/api/metrics";
import type { Notebook } from "@/src/types/notebook";
import type { Flow } from "@/src/types/flow";
import type { Metric } from "@/src/types/metric";
import type { Filter } from "@/src/types/filter";

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
	fetchNotebook: (tenant: string, notebookId: string) => Promise<void>;
	fetchFlows: (tenant: string, start: Date, end: Date) => Promise<void>;
	fetchMetrics: (tenant: string, start: Date, end: Date) => Promise<void>;
	updateNotebook: (
		tenant: string,
		notebook: Notebook,
		updates: Partial<Notebook>,
	) => void;
	createNotebook: (tenant: string, notebook: Omit<Notebook, "id">) => Notebook;
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
			fetchFlows: async (tenant: string, start: Date, end: Date) => {
				set({ flowsLoading: true });
				try {
					const response = await Flows.getByTenant(tenant, start, end, []);
					const flows = response.data.map(toFlow);
					set({ flows, flowsLoading: false });
				} catch (error) {
					console.error("Failed to fetch flows:", error);
					set({ flows: [], flowsLoading: false });
				}
			},
			fetchMetrics: async (
				tenant: string,
				start: Date,
				end: Date,
				filters: Filter[],
			) => {
				set({ metricsLoading: true });
				try {
					const response = await Metrics.getByTenant(
						tenant,
						start,
						end,
						filters,
					);
					set({ metrics: response.data, metricsLoading: false });
				} catch (error) {
					console.error("Failed to fetch metrics:", error);
					set({ metrics: [], metricsLoading: false });
				}
			},
			setCurrentNotebook: (tenant: string, notebookId: string) => {
				const currentNotebook =
					(get().notebooks[tenant] || []).find((nb) => nb.id === notebookId) ||
					null;
				set({ currentNotebook });
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

			fetchNotebook: async (tenant: string, notebookId: string) => {
				set({ loading: true, error: null });
				try {
					const notebook = await Notebooks.getById(tenant, notebookId);
					set({ currentNotebook: notebook, loading: false });
				} catch (error) {
					console.error("Failed to fetch notebook:", error);
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to fetch notebook",
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

			createNotebook: (
				tenant: string,
				notebook: Omit<Notebook, "id">,
			): Notebook => {
				const { notebooks } = get();
				const tenantNotebooks = notebooks[tenant] || [];

				// Generate UUID upfront
				const newNotebook: Notebook = {
					...notebook,
					id: crypto.randomUUID(),
				};

				// Update state immediately with loading = true
				set({
					notebookCreating: true,
					notebooks: {
						...notebooks,
						[tenant]: [...tenantNotebooks, newNotebook],
					},
				});

				// Call API in background
				Notebooks.create(tenant, newNotebook).then(() => {
					set({ notebookCreating: false });
				});

				// Return immediately for navigation
				return newNotebook;
			},

			deleteNotebook: async (tenant: string, notebookId: string) => {
				try {
					await Notebooks.delete(tenant, notebookId);

					const { notebooks } = get();
					const tenantNotebooks = notebooks[tenant] || [];

					set({
						notebooks: {
							...notebooks,
							[tenant]: tenantNotebooks.filter((nb) => nb.id !== notebookId),
						},
					});
				} catch (error) {
					console.error("Failed to delete notebook:", error);
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to delete notebook",
					});
				}
			},
		}),
		{ name: "notebooks" },
	),
);
