import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Labels, processLabels } from "@/src/services/api/labels";
import type { Label } from "@/src/types/label";

interface LabelsState {
	labels: Label[];
	tenants: string[];
	loading: boolean;
	error: string | null;
	fetchLabels: () => Promise<void>;
}

export const useLabelsStore = create<LabelsState>()(
	devtools(
		(set) => ({
			// Dummy data for testing
			labels: [
				{
					name: "environment",
					values: ["production", "staging", "development"],
				},
				{ name: "service", values: ["api", "web", "worker", "database"] },
				{ name: "region", values: ["us-east-1", "us-west-2", "eu-west-1"] },
			],
			tenants: ["acme-corp", "globex-corporation", "stark-industries"],
			loading: false,
			error: null,

			fetchLabels: async () => {
				set({ loading: true, error: null });
				try {
					const response = await Labels.getAll();
					const allLabels = processLabels(response.data);

					// Extract tenant label separately
					const tenantLabels =
						allLabels.find((label) => label.name === "tenant")?.values || [];
					const otherLabels = allLabels.filter(
						(label) => label.name !== "tenant",
					);

					set({
						labels: otherLabels,
						tenants: tenantLabels,
						loading: false,
					});
				} catch (error) {
					console.error("Failed to fetch labels:", error);
					set({
						error:
							error instanceof Error ? error.message : "Failed to fetch labels",
						loading: false,
					});
				}
			},
		}),
		{ name: "labels" },
	),
);
