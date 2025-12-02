import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Labels } from "@/src/services/api/labels";
import type { Label } from "@/src/types/label";

interface LabelsState {
	labels: Label[];
	tenants: string[];
	loading: boolean;
	error: string | null;
	fetchLabelsAndTenants: () => Promise<void>;
}

export const useLabelsStore = create<LabelsState>()(
	devtools(
		(set) => ({
			labels: [],
			tenants: [],
			loading: false,
			error: null,

			fetchLabelsAndTenants: async () => {
				set({ loading: true, error: null });
				const response = await Labels.getAll();
				set({
					labels: response.labels,
					tenants: response.tenants,
					loading: false,
				});
			},
		}),
		{ name: "labels" },
	),
);
