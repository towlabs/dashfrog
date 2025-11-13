import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Filter } from "@/src/types/filter";
import type { TimeWindow } from "@/src/types/timewindow";

interface TenantState {
	currentTenant: string | null;
	timeWindow: TimeWindow;
	filters: Filter[];
	setCurrentTenant: (tenant: string) => void;
	setTimeWindow: (timeWindow: TimeWindow) => void;
	setFilters: (filters: Filter[]) => void;
	addFilter: (filter: Filter) => void;
	removeFilter: (index: number) => void;
}

export const useTenantStore = create<TenantState>()(
	devtools(
		(set, get) => ({
			currentTenant: null,
			timeWindow: { type: "relative", metadata: { value: "24h" } },
			filters: [],
			setCurrentTenant: (tenant: string) => {
				set({ currentTenant: tenant });
			},

			setTimeWindow: (timeWindow: TimeWindow) => {
				set({ timeWindow });
			},

			setFilters: (filters: Filter[]) => {
				set({ filters });
			},

			addFilter: (filter: Filter) => {
				const { filters, setFilters } = get();
				setFilters([...filters, filter]);
			},

			removeFilter: (index: number) => {
				const { filters, setFilters } = get();
				setFilters(filters.filter((_, i) => i !== index));
			},
		}),
		{ name: "tenant" },
	),
);
