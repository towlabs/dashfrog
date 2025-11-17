import type { Notebook } from "@/src/types/notebook";

// Mock notebooks data
const mockNotebooksData: Record<string, Notebook[]> = {
	// Will be populated per tenant
};

// Generate mock notebooks for a tenant
function generateMockNotebooks(_tenant: string): Notebook[] {
	return [
		{
			id: "1",
			title: "Getting Started with DashFrog",
			description: "Learn the basics of using DashFrog for observability",
			blocks: [
				{
					id: "003d27f3-58d3-4417-b776-b81fb252a593",
					type: "flowStatus",
					props: {
						flowName: "user-registration-flow",
					},
					children: [],
				},
				{
					id: "d91ea77b-2246-456d-89c2-ab65a638347f",
					type: "heading",
					props: {
						backgroundColor: "default",
						textColor: "default",
						textAlignment: "left",
						level: 3,
						isToggleable: false,
					},
					content: [
						{
							type: "text",
							text: "test",
							styles: {},
						},
					],
					children: [],
				},
				{
					id: "f0405057-411a-432b-a2ff-9844ce1012d0",
					type: "paragraph",
					props: {
						backgroundColor: "default",
						textColor: "default",
						textAlignment: "left",
					},
					content: [],
					children: [],
				},
				{
					id: "6fefea9b-5c7f-4b6e-851b-67789d2de4c1",
					type: "timeline",
					props: {
						showEvent: true,
						showLabels: true,
						showTime: true,
					},
					children: [],
				},
				{
					id: "5c8f5fa8-0096-4f57-9855-f6f549fb9870",
					type: "flowHistory",
					props: {
						flowName: "payment-processing",
						statusFilter: "all",
					},
					children: [],
				},
				{
					id: "003d27f3-58d3-4417-b776-b81fb252a593",
					type: "paragraph",
					props: {
						backgroundColor: "default",
						textColor: "default",
						textAlignment: "left",
					},
					content: [],
					children: [],
				},
			],
		},
		{
			id: "2",
			title: "API Documentation",
			description: "Complete reference for the DashFrog API",
			blocks: null,
		},
		{
			id: "3",
			title: "Troubleshooting Guide",
			description: "Common issues and their solutions",
			blocks: [
				{
					id: "d91ea77b-2246-456d-89c2-ab65a638347f",
					type: "heading",
					props: {
						backgroundColor: "default",
						textColor: "default",
						textAlignment: "left",
						level: 3,
						isToggleable: false,
					},
					content: [
						{
							type: "text",
							text: "test",
							styles: {},
						},
					],
					children: [],
				},
				{
					id: "f0405057-411a-432b-a2ff-9844ce1012d0",
					type: "paragraph",
					props: {
						backgroundColor: "default",
						textColor: "default",
						textAlignment: "left",
					},
					content: [],
					children: [],
				},
			],
		},
		{
			id: "4",
			title: "Best Practices",
			description: "Recommended patterns and practices for using DashFrog",
			blocks: null,
		},
	];
}

// Initialize mock data for a tenant if not exists
function ensureMockData(tenant: string): void {
	if (!mockNotebooksData[tenant]) {
		mockNotebooksData[tenant] = generateMockNotebooks(tenant);
	}
}

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
		return response.json();
	},

	// Get a single notebook by ID
	getById: async (tenant: string, notebookId: string): Promise<Notebook> => {
		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 200));

		ensureMockData(tenant);
		const notebook = mockNotebooksData[tenant].find(
			(nb) => nb.id === notebookId,
		);

		if (!notebook) {
			throw new Error(`Notebook ${notebookId} not found`);
		}

		return notebook;
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
	update: async (notebook: Notebook): Promise<any> => {
		const response = await fetch(`/api/notebooks/update`, {
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
	delete: async (tenant: string, notebookId: string): Promise<void> => {
		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 200));

		ensureMockData(tenant);

		const index = mockNotebooksData[tenant].findIndex(
			(nb) => nb.id === notebookId,
		);
		if (index === -1) {
			throw new Error(`Notebook ${notebookId} not found`);
		}

		mockNotebooksData[tenant].splice(index, 1);
	},
};
