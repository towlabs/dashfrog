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
			labels: [],
			tenants: [],
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
