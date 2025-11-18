import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Labels } from "@/src/services/api/labels";
import type { Label } from "@/src/types/label";

interface LabelsState {
	labels: Label[];
	tenants: string[];
	loadingLabels: boolean;
	loadingTenants: boolean;
	error: string | null;
	fetchLabels: () => Promise<void>;
	fetchTenants: () => Promise<void>;
}

export const useLabelsStore = create<LabelsState>()(
	devtools(
		(set) => ({
			labels: [],
			tenants: [],
			loadingLabels: false,
			loadingTenants: false,
			error: null,

			fetchLabels: async () => {
				set({ loadingLabels: true, error: null });
				const response = await Labels.getAllLabels();
				set({
					labels: response,
					loadingLabels: false,
				});
			},

			fetchTenants: async () => {
				set({ loadingTenants: true, error: null });
				const response = await Labels.getAllTenants();
				set({
					tenants: response,
					loadingTenants: false,
				});
			},
		}),
		{ name: "labels" },
	),
);
