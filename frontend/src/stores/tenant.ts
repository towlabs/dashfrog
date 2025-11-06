import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Flows, toFlow } from "@/src/services/api/flows";
import { Metrics, toMetric } from "@/src/services/api/metrics";
import { processTimelineEvents, Timeline } from "@/src/services/api/timeline";
import type { Filter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";
import type { Metric } from "@/src/types/metric";
import type { TimelineEvent } from "@/src/types/timeline";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

interface TenantState {
	currentTenant: string | null;
	timeline: TimelineEvent[];
	metrics: Metric[];
	flows: Flow[];
	timeWindow: TimeWindow;
	filters: Filter[];
	flowsLoading: boolean;
	timelineLoading: boolean;
	metricsLoading: boolean;
	fetchTimeline: (tenant: string) => Promise<void>;
	fetchFlows: (tenant: string) => Promise<void>;
	fetchMetrics: (tenant: string) => Promise<void>;
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
			metrics: [],
			flows: [],
			timeWindow: { type: "relative", metadata: { value: "24h" } },
			filters: [],
			timelineLoading: false,
			flowsLoading: false,
			metricsLoading: false,
			setCurrentTenant: (tenant: string) => {
				set({ currentTenant: tenant });
			},

			setTimeWindow: (timeWindow: TimeWindow) => {
				set({ timeWindow });
				// Refetch data with new time range
				const { currentTenant, fetchTimeline, fetchFlows, fetchMetrics } = get();
				if (currentTenant) {
					void fetchTimeline(currentTenant);
					void fetchFlows(currentTenant);
					void fetchMetrics(currentTenant);
				}
			},

			setFilters: (filters: Filter[]) => {
				set({ filters });
				// Refetch data with new filters
				const { currentTenant, fetchTimeline, fetchFlows, fetchMetrics } = get();
				if (currentTenant) {
					void fetchTimeline(currentTenant);
					void fetchFlows(currentTenant);
					void fetchMetrics(currentTenant);
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

			fetchMetrics: async (tenant: string) => {
				set({ metricsLoading: true, currentTenant: tenant });
				try {
					const { timeWindow, filters } = get();
					const { start, end } = resolveTimeWindow(timeWindow);
					const response = await Metrics.getByTenant(tenant, start, end, filters);
					const metrics = response.data.map(toMetric);
					set({ metrics, metricsLoading: false });
				} catch (error) {
					console.error("Failed to fetch metrics:", error);
					set({
						metricsLoading: false,
					});
				}
			},
		}),
		{ name: "tenant" },
	),
);
