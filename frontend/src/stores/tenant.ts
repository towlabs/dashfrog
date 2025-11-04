import { create } from "zustand";
import { Timeline, processTimelineEvents } from "@/src/services/api/timeline";
import type { Filter } from "@/src/types/filter";
import type { TimelineEvent } from "@/src/types/timeline";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

interface TenantState {
	currentTenant: string | null;
	timeline: TimelineEvent[];
	timeWindow: TimeWindow;
	filters: Filter[];
	loading: boolean;
	error: string | null;
	fetchTimeline: (tenant: string) => Promise<void>;
	setCurrentTenant: (tenant: string) => void;
	setTimeWindow: (timeWindow: TimeWindow) => void;
	setFilters: (filters: Filter[]) => void;
	addFilter: (filter: Filter) => void;
	removeFilter: (index: number) => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
	currentTenant: null,
	timeline: [],
	timeWindow: { type: "relative", metadata: { value: "24h" } },
	filters: [],
	loading: false,
	error: null,

	setCurrentTenant: (tenant: string) => {
		set({ currentTenant: tenant });
	},

	setTimeWindow: (timeWindow: TimeWindow) => {
		set({ timeWindow });
		// Refetch timeline with new time range
		const { currentTenant, fetchTimeline } = get();
		if (currentTenant) {
			void fetchTimeline(currentTenant);
		}
	},

	setFilters: (filters: Filter[]) => {
		set({ filters });
		// Refetch timeline with new filters
		const { currentTenant, fetchTimeline } = get();
		if (currentTenant) {
			void fetchTimeline(currentTenant);
		}
	},

	addFilter: (filter: Filter) => {
		const { filters, setFilters } = get();
		setFilters([...filters, filter]);
	},

	removeFilter: (index: number) => {
		const { filters, setFilters } = get();
		setFilters(filters.filter((_, i) => i !== index));
	},

	fetchTimeline: async (tenant: string) => {
		set({ loading: true, error: null, currentTenant: tenant });
		try {
			const { timeWindow, filters } = get();
			const { start, end } = resolveTimeWindow(timeWindow);
			const response = await Timeline.getByTenant(tenant, start, end, filters);
			const timelineEvents = processTimelineEvents(response.data);
			set({ timeline: timelineEvents, loading: false });
		} catch (error) {
			console.error("Failed to fetch timeline:", error);
			set({
				error:
					error instanceof Error ? error.message : "Failed to fetch timeline",
				loading: false,
			});
		}
	},
}));
