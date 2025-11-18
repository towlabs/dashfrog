import type { Block } from "@blocknote/core";
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
};

export const Notebooks = {
	// Get all notebooks for a tenant
	getAll: async (tenant: string): Promise<Notebook[]> => {
		const query = new URLSearchParams();
		query.set("tenant", tenant);
		const response = await fetch(`/api/notebooks/list?${query.toString()}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
		return (await response.json()).map((notebook: NotebookResponse) => ({
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
		}));
	},

	// Create a new notebook
	create: async (tenant: string, notebook: Notebook): Promise<null> => {
		const response = await fetch(`/api/notebooks/create`, {
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
		const response = await fetch(`/api/notebooks/${notebook.id}/update`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(notebook),
		});

		if (!response.ok) {
			throw new Error(`Failed to update notebook: ${response.statusText}`);
		}

		return await response.json();
	},

	// Delete a notebook
	delete: async (notebookId: string): Promise<void> => {
		const response = await fetch(`/api/notebooks/${notebookId}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
		});
		return response.json();
	},
};
