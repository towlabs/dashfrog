import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Flows, toFlow, toFlowHistory } from "@/src/services/api/flows";
import { processTimelineEvents, Timeline } from "@/src/services/api/timeline";
import type { Filter } from "@/src/types/filter";
import type { Flow, FlowHistory } from "@/src/types/flow";
import type { TimelineEvent } from "@/src/types/timeline";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

interface TenantState {
	currentTenant: string | null;
	timeline: TimelineEvent[];
	flows: Flow[];
	timeWindow: TimeWindow;
	filters: Filter[];
	flowsLoading: boolean;
	timelineLoading: boolean;
	fetchTimeline: (tenant: string) => Promise<void>;
	fetchFlows: (tenant: string) => Promise<void>;
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
			timeline: [],
			flows: [],
			timeWindow: { type: "relative", metadata: { value: "24h" } },
			filters: [],
			timelineLoading: false,
			flowsLoading: false,

			setCurrentTenant: (tenant: string) => {
				set({ currentTenant: tenant });
			},

			setTimeWindow: (timeWindow: TimeWindow) => {
				set({ timeWindow });
				// Refetch data with new time range
				const { currentTenant, fetchTimeline, fetchFlows } = get();
				if (currentTenant) {
					void fetchTimeline(currentTenant);
					void fetchFlows(currentTenant);
				}
			},

			setFilters: (filters: Filter[]) => {
				set({ filters });
				// Refetch data with new filters
				const { currentTenant, fetchTimeline, fetchFlows } = get();
				if (currentTenant) {
					void fetchTimeline(currentTenant);
					void fetchFlows(currentTenant);
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
				set({ timelineLoading: true, currentTenant: tenant });
				try {
					const { timeWindow, filters } = get();
					const { start, end } = resolveTimeWindow(timeWindow);
					const response = await Timeline.getByTenant(
						tenant,
						start,
						end,
						filters,
					);
					const timelineEvents = processTimelineEvents(response.data);
					set({ timeline: timelineEvents, timelineLoading: false });
				} catch (error) {
					console.error("Failed to fetch timeline:", error);
					set({
						timelineLoading: false,
					});
				}
			},

			fetchFlows: async (tenant: string) => {
				set({ flowsLoading: true, currentTenant: tenant });
				try {
					const { timeWindow, filters } = get();
					const { start, end } = resolveTimeWindow(timeWindow);
					const response = await Flows.getByTenant(tenant, start, end, filters);
					const flows = response.data.map(toFlow);
					set({ flows, flowsLoading: false });
				} catch (error) {
					console.error("Failed to fetch flows:", error);
					set({
						flowsLoading: false,
					});
				}
			},
		}),
		{ name: "tenant" },
	),
);
