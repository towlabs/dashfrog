import { fetchWithAuth } from "@/src/lib/fetch-wrapper";

export const Tenants = {
	getAll: async (): Promise<string[]> => {
		const response = await fetchWithAuth("/api/flows/tenants", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
		return await response.json();
	},
};
