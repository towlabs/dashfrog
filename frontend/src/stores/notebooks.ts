import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Notebooks } from "@/src/services/api/notebooks";
import type { Notebook } from "@/src/types/notebook";

interface NotebooksState {
	notebooks: Record<string, Notebook[]>; // Keyed by tenant
	currentNotebook: Notebook | null;
	loading: boolean;
	error: string | null;
	setCurrentNotebook: (tenant: string, notebookId: string) => Notebook | null;
	fetchNotebooks: (tenant: string) => Promise<void>;
	fetchNotebook: (tenant: string, notebookId: string) => Promise<void>;
	updateNotebook: (
		tenant: string,
		notebookId: string,
		updates: Partial<Notebook>,
	) => Promise<void>;
	createNotebook: (
		tenant: string,
		notebook: Omit<Notebook, "id">,
	) => Promise<void>;
	deleteNotebook: (tenant: string, notebookId: string) => Promise<void>;
}

export const useNotebooksStore = create<NotebooksState>()(
	devtools(
		(set, get) => ({
			notebooks: {},
			currentNotebook: null,
			loading: true,
			error: null,
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

			updateNotebook: async (
				tenant: string,
				notebookId: string,
				updates: Partial<Notebook>,
			) => {
				try {
					const { notebooks, currentNotebook } = get();
					const tenantNotebooks = notebooks[tenant] || [];

					// Update in notebooks list
					const updatedNotebooks = tenantNotebooks.map((nb) =>
						nb.id === notebookId ? { ...nb, ...updates } : nb,
					);

					// Update current notebook if it's the one being edited
					const updatedCurrent =
						currentNotebook?.id === notebookId
							? { ...currentNotebook, ...updates }
							: currentNotebook;

					set({
						notebooks: {
							...notebooks,
							[tenant]: updatedNotebooks,
						},
						currentNotebook: updatedCurrent,
					});

					await Notebooks.update(tenant, notebookId, updates);
				} catch (error) {
					console.error("Failed to update notebook:", error);
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to update notebook",
					});
				}
			},

			createNotebook: async (
				tenant: string,
				notebook: Omit<Notebook, "id">,
			) => {
				try {
					const newNotebook = await Notebooks.create(tenant, notebook);

					const { notebooks } = get();
					const tenantNotebooks = notebooks[tenant] || [];

					set({
						notebooks: {
							...notebooks,
							[tenant]: [...tenantNotebooks, newNotebook],
						},
					});
				} catch (error) {
					console.error("Failed to create notebook:", error);
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to create notebook",
					});
				}
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
