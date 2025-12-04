import type { Block } from "@blocknote/core";
import { fetchWithAuth } from "@/src/lib/fetch-wrapper";
import type { Filter } from "@/src/types/filter";
import type { Notebook } from "@/src/types/notebook";
import type { RelativeTimeValue } from "@/src/types/timewindow";

type NotebookResponse = {
	id: string;
	title: string;
	description: string;
	blocks: Block[] | null;
	timeWindow:
		| { type: "relative"; metadata: { value: RelativeTimeValue } }
		| { type: "absolute"; metadata: { start: string; end: string } };
	filters: Filter[];
	flowBlocksFilters: { names: string[]; filters: Filter[] }[] | null;
	metricBlocksFilters: { names: string[]; filters: Filter[] }[] | null;
	isPublic: boolean;
	tenant?: string;
};

const parseNotebook = (notebook: NotebookResponse): Notebook => {
	return {
		...notebook,
		timeWindow:
			notebook.timeWindow?.type === "absolute"
				? {
						type: "absolute",
						metadata: {
							start: new Date(notebook.timeWindow.metadata.start),
							end: new Date(notebook.timeWindow.metadata.end),
						},
					}
				: notebook.timeWindow || {
						type: "relative",
						metadata: { value: "24h" },
					},
		filters: notebook.filters || [],
	};
};

export const Notebooks = {
	duplicate: async (notebookId: string, targetTenants: string[]) => {
		await fetchWithAuth(`/api/notebooks/${notebookId}/duplicate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ targetTenants }),
		});
	},
	getOne: async (notebookId: string): Promise<Notebook | null> => {
		const response = await fetchWithAuth(`/api/notebooks/${notebookId}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
		if (!response.ok) {
			return null;
		}
		return parseNotebook(await response.json());
	},
	// Get all notebooks for a tenant
	getAll: async (tenant: string): Promise<Notebook[]> => {
		const query = new URLSearchParams();
		query.set("tenant", tenant);
		const response = await fetchWithAuth(
			`/api/notebooks/list?${query.toString()}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
		return (await response.json()).map(parseNotebook);
	},

	// Create a new notebook
	create: async (tenant: string, notebook: Notebook): Promise<null> => {
		const response = await fetchWithAuth(`/api/notebooks/create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				tenant,
				notebook,
			}),
		});
		return response.json();
	},

	// Update a notebook
	update: async (notebook: Notebook): Promise<null> => {
		const response = await fetchWithAuth(
			`/api/notebooks/${notebook.id}/update`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(notebook),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to update notebook: ${response.statusText}`);
		}

		return await response.json();
	},

	// Delete a notebook
	delete: async (notebookId: string): Promise<void> => {
		const response = await fetchWithAuth(`/api/notebooks/${notebookId}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
		});
		return response.json();
	},
};
