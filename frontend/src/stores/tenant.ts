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
	flowHistories: FlowHistory[];
	timeWindow: TimeWindow;
	filters: Filter[];
	loading: boolean;
	error: string | null;
	fetchTimeline: (tenant: string) => Promise<void>;
	fetchFlows: (tenant: string) => Promise<void>;
	fetchFlowHistory: (tenant: string, flowName: string) => Promise<void>;
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
			flows: [
				{
					name: "user-registration-flow",
					labels: {
						environment: "production",
						service: "api",
						region: "us-east-1",
					},
					lastRunStatus: "success",
					lastRunStartedAt: new Date("2025-01-04T10:00:00Z"),
					lastRunEndedAt: new Date("2025-01-04T10:02:30Z"),
					runCount: 150,
					successCount: 145,
					pendingCount: 2,
					failedCount: 3,
				},
				{
					name: "payment-processing",
					labels: {
						environment: "production",
						service: "worker",
						region: "us-west-2",
					},
					lastRunStatus: "success",
					lastRunStartedAt: new Date("2025-01-04T10:05:00Z"),
					lastRunEndedAt: new Date("2025-01-04T10:06:15Z"),
					runCount: 320,
					successCount: 310,
					pendingCount: 5,
					failedCount: 5,
				},
				{
					name: "data-sync-job",
					labels: {
						environment: "staging",
						service: "database",
						region: "eu-west-1",
					},
					lastRunStatus: "running",
					lastRunStartedAt: new Date("2025-01-04T10:10:00Z"),
					lastRunEndedAt: null,
					runCount: 89,
					successCount: 75,
					pendingCount: 10,
					failedCount: 4,
				},
				{
					name: "email-notification",
					labels: {
						environment: "production",
						service: "worker",
						region: "us-east-1",
					},
					lastRunStatus: "failure",
					lastRunStartedAt: new Date("2025-01-04T09:55:00Z"),
					lastRunEndedAt: new Date("2025-01-04T09:55:45Z"),
					runCount: 210,
					successCount: 180,
					pendingCount: 15,
					failedCount: 15,
				},
				{
					name: "backup-process",
					labels: {
						environment: "production",
						service: "database",
						region: "us-east-1",
					},
					lastRunStatus: "success",
					lastRunStartedAt: new Date("2025-01-04T09:30:00Z"),
					lastRunEndedAt: new Date("2025-01-04T09:45:20Z"),
					runCount: 50,
					successCount: 50,
					pendingCount: 0,
					failedCount: 0,
				},
			],
			flowHistories: [],
			timeWindow: { type: "relative", metadata: { value: "24h" } },
			filters: [],
			loading: false,
			error: null,

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
				set({ loading: true, error: null, currentTenant: tenant });
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
					set({ timeline: timelineEvents, loading: false });
				} catch (error) {
					console.error("Failed to fetch timeline:", error);
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to fetch timeline",
						loading: false,
					});
				}
			},

			fetchFlows: async (tenant: string) => {
				set({ loading: true, error: null, currentTenant: tenant });
				try {
					const { timeWindow, filters } = get();
					const { start, end } = resolveTimeWindow(timeWindow);
					const response = await Flows.getByTenant(tenant, start, end, filters);
					const flows = response.data.map(toFlow);
					set({ flows, loading: false });
				} catch (error) {
					console.error("Failed to fetch flows:", error);
					set({
						error:
							error instanceof Error ? error.message : "Failed to fetch flows",
						loading: false,
					});
				}
			},

			fetchFlowHistory: async (tenant: string, flowName: string) => {
				try {
					const { timeWindow, filters } = get();
					const { start, end } = resolveTimeWindow(timeWindow);
					const response = await Flows.getHistory(
						tenant,
						flowName,
						start,
						end,
						filters,
					);
					const flowHistories = response.data.map(toFlowHistory);
					set({ flowHistories });
				} catch (error) {
					console.error("Failed to fetch flow history:", error);
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to fetch flow history",
					});
				}
			},
		}),
		{ name: "tenant" },
	),
);
