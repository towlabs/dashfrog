import { NewRestAPI } from "@/src/services/api/_helper";
import type { TimeWindow } from "@/src/types/timewindow";
import type { Filter } from "@/src/types/filter";
import type {
	Flow,
	FlowHistory,
	FlowHistoryEvent,
	FlowHistoryStep,
} from "@/src/types/flow";

const FlowsAPI = NewRestAPI(`api`);

/**
 * Raw flow response from backend API (snake_case)
 */
interface FlowApiResponse {
	name: string;
	labels: Record<string, string>;
	last_run_status: "success" | "failure" | "running";
	last_run_started_at: string; // ISO date string
	last_run_ended_at: string | null; // ISO date string
	run_count: number;
	success_count: number;
	pending_count: number;
	failed_count: number;
}

/**
 * Raw flow history event response from backend API (snake_case)
 */
interface FlowHistoryEventApiResponse {
	event_name: string;
	event_dt: string; // ISO date string
}

/**
 * Raw flow history step response from backend API (snake_case)
 */
interface FlowHistoryStepApiResponse {
	name: string;
	start_time: string; // ISO date string
	end_time: string | null; // ISO date string
	status: "success" | "failure" | "running";
}

/**
 * Raw flow history response from backend API (snake_case)
 */
interface FlowHistoryApiResponse {
	name: string;
	start_time: string; // ISO date string
	end_time: string | null; // ISO date string
	status: "success" | "failure" | "running";
	events: FlowHistoryEventApiResponse[];
	steps: FlowHistoryStepApiResponse[];
	labels: Record<string, string>;
}

type FlowsApiResponse = FlowApiResponse[];
type FlowHistoriesApiResponse = FlowHistoryApiResponse[];

/**
 * Convert backend API response to frontend Flow type
 */
function toFlow(apiFlow: FlowApiResponse): Flow {
	return {
		name: apiFlow.name,
		labels: apiFlow.labels,
		lastRunStatus: apiFlow.last_run_status,
		lastRunStartedAt: new Date(apiFlow.last_run_started_at),
		lastRunEndedAt: apiFlow.last_run_ended_at
			? new Date(apiFlow.last_run_ended_at)
			: null,
		runCount: apiFlow.run_count,
		successCount: apiFlow.success_count,
		pendingCount: apiFlow.pending_count,
		failedCount: apiFlow.failed_count,
	};
}

/**
 * Convert backend API response to frontend FlowHistoryEvent type
 */
function toFlowHistoryEvent(
	apiEvent: FlowHistoryEventApiResponse,
): FlowHistoryEvent {
	return {
		eventName: apiEvent.event_name,
		eventDt: new Date(apiEvent.event_dt),
	};
}

/**
 * Convert backend API response to frontend FlowHistoryStep type
 */
function toFlowHistoryStep(
	apiStep: FlowHistoryStepApiResponse,
): FlowHistoryStep {
	return {
		name: apiStep.name,
		startTime: new Date(apiStep.start_time),
		endTime: apiStep.end_time ? new Date(apiStep.end_time) : null,
		status: apiStep.status,
	};
}

/**
 * Convert backend API response to frontend FlowHistory type
 */
function toFlowHistory(apiFlowHistory: FlowHistoryApiResponse): FlowHistory {
	return {
		name: apiFlowHistory.name,
		startTime: new Date(apiFlowHistory.start_time),
		endTime: apiFlowHistory.end_time ? new Date(apiFlowHistory.end_time) : null,
		status: apiFlowHistory.status,
		events: apiFlowHistory.events.map(toFlowHistoryEvent),
		steps: apiFlowHistory.steps.map(toFlowHistoryStep),
		labels: apiFlowHistory.labels,
	};
}

// Dummy data generator for development
function generateDummyFlowHistories(flowName: string): FlowHistoryApiResponse[] {
	const now = new Date();
	const histories: FlowHistoryApiResponse[] = [];

	// Generate 20 runs over the past 24 hours
	for (let i = 0; i < 20; i++) {
		const startTime = new Date(now.getTime() - i * 3600000); // Every hour
		const duration = Math.random() * 600000; // 0-10 minutes
		const hasEnded = Math.random() > 0.1; // 90% have ended
		const status: "success" | "failure" | "running" = hasEnded
			? Math.random() > 0.2
				? "success"
				: "failure"
			: "running";

		histories.push({
			name: flowName,
			start_time: startTime.toISOString(),
			end_time: hasEnded
				? new Date(startTime.getTime() + duration).toISOString()
				: null,
			status,
			events: [
				{
					event_name: "workflow_started",
					event_dt: startTime.toISOString(),
				},
				{
					event_name: "step_1_completed",
					event_dt: new Date(startTime.getTime() + duration * 0.3).toISOString(),
				},
				{
					event_name: "step_2_completed",
					event_dt: new Date(startTime.getTime() + duration * 0.6).toISOString(),
				},
				...(hasEnded
					? [
							{
								event_name:
									status === "success"
										? "workflow_completed"
										: "workflow_failed",
								event_dt: new Date(
									startTime.getTime() + duration,
								).toISOString(),
							},
						]
					: []),
			],
			steps: [
				{
					name: "initialize",
					start_time: startTime.toISOString(),
					end_time: new Date(
						startTime.getTime() + duration * 0.2,
					).toISOString(),
					status: "success",
				},
				{
					name: "process_data",
					start_time: new Date(
						startTime.getTime() + duration * 0.2,
					).toISOString(),
					end_time: new Date(
						startTime.getTime() + duration * 0.7,
					).toISOString(),
					status: "success",
				},
				{
					name: "finalize",
					start_time: new Date(
						startTime.getTime() + duration * 0.7,
					).toISOString(),
					end_time: hasEnded
						? new Date(startTime.getTime() + duration).toISOString()
						: null,
					status: hasEnded ? status : "running",
				},
			],
			labels: {
				environment: "production",
				service: "api",
				region: "us-east-1",
			},
		});
	}

	return histories;
}

const Flows = {
	/**
	 * Get flows for a specific tenant with optional time range and filters
	 */
	getByTenant: (tenant: string, start: Date, end: Date, filters?: Filter[]) => {
		const params: Record<string, string> = {};

		// Add time range
		params.from = start.toISOString();
		params.to = end.toISOString();

		// Add filters if provided
		if (filters && filters.length > 0) {
			params.filters = JSON.stringify(filters);
		}

		return FlowsAPI.get<FlowsApiResponse>(
			`flows/${encodeURIComponent(tenant)}`,
			{
				params,
				meta: { action: "fetch", resource: "flows" },
			},
		);
	},

	/**
	 * Get flow history (runs) for a specific flow
	 */
	getHistory: async (
		_tenant: string,
		flowName: string,
		_start: Date,
		_end: Date,
		_filters?: Filter[],
	) => {
		// TODO: Remove dummy data when backend is ready
		// Return dummy data for now
		const dummyData = generateDummyFlowHistories(flowName);
		return Promise.resolve({ data: dummyData });

		/* Uncomment when backend is ready
		const params: Record<string, string> = {};

		// Add time range
		params.from = start.toISOString();
		params.to = end.toISOString();

		// Add filters if provided
		if (filters && filters.length > 0) {
			params.filters = JSON.stringify(filters);
		}

		return FlowsAPI.get<FlowHistoriesApiResponse>(
			`flows/${encodeURIComponent(tenant)}/${encodeURIComponent(flowName)}/history`,
			{
				params,
				meta: { action: "fetch", resource: "flow-history" },
			},
		);
		*/
	},

	/**
	 * Get a specific flow run by ID
	 */
	getHistoryById: (tenant: string, flowName: string, runId: string) => {
		return FlowsAPI.get<FlowHistoryApiResponse>(
			`flows/${encodeURIComponent(tenant)}/${encodeURIComponent(flowName)}/history/${encodeURIComponent(runId)}`,
			{
				meta: { action: "fetch", resource: "flow-history-detail" },
			},
		);
	},
};

export {
	FlowsAPI,
	Flows,
	toFlow,
	toFlowHistory,
	toFlowHistoryEvent,
	toFlowHistoryStep,
};
