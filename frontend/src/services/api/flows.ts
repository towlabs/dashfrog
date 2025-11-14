import { NewRestAPI } from "@/src/services/api/_helper";
import type { Filter } from "@/src/types/filter";
import type {
	DetailedFlow,
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
	flow: FlowApiResponse;
	histories: {
		start_time: string; // ISO date string
		end_time: string | null; // ISO date string
		status: "success" | "failure" | "running";
		events: FlowHistoryEventApiResponse[];
		steps: FlowHistoryStepApiResponse[];
		labels: Record<string, string>;
	}[];
}

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
function toFlowHistory(
	apiFlowHistory: FlowHistoryApiResponse["histories"],
): FlowHistory[] {
	return apiFlowHistory.map((h) => ({
		startTime: new Date(h.start_time),
		endTime: h.end_time ? new Date(h.end_time) : null,
		status: h.status,
		events: h.events.map(toFlowHistoryEvent),
		steps: h.steps.map(toFlowHistoryStep),
		labels: h.labels,
	}));
}

// Dummy data generator for development
function generateDummyFlowHistories() {
	const now = new Date();
	const histories: FlowHistoryApiResponse["histories"] = [];

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
					event_dt: new Date(
						startTime.getTime() + duration * 0.3,
					).toISOString(),
				},
				{
					event_name: "step_2_completed",
					event_dt: new Date(
						startTime.getTime() + duration * 0.6,
					).toISOString(),
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
						startTime.getTime() + duration * 0.15,
					).toISOString(),
					status: "success",
				},
				{
					name: "fetch_user_data",
					start_time: new Date(
						startTime.getTime() + duration * 0.15,
					).toISOString(),
					end_time: new Date(
						startTime.getTime() + duration * 0.45,
					).toISOString(),
					status: "success",
				},
				{
					name: "validate_input",
					start_time: new Date(
						startTime.getTime() + duration * 0.15,
					).toISOString(),
					end_time: new Date(
						startTime.getTime() + duration * 0.3,
					).toISOString(),
					status: "success",
				},
				{
					name: "process_data",
					start_time: new Date(
						startTime.getTime() + duration * 0.45,
					).toISOString(),
					end_time: new Date(
						startTime.getTime() + duration * 0.8,
					).toISOString(),
					status: "success",
				},
				{
					name: "finalize",
					start_time: new Date(
						startTime.getTime() + duration * 0.8,
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
	getByTenant: async (
		_tenant: string,
		_start: Date,
		_end: Date,
		_filters?: Filter[],
	) => {
		// TODO: Remove dummy data when backend is ready
		// Simulate network delay for testing loading states
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Return dummy data
		// TIP: To test empty state, change dummyData to []
		const dummyData: FlowApiResponse[] = [
			{
				name: "user-registration-flow",
				labels: {
					environment: "production",
					service: "api",
					region: "us-east-1",
				},
				last_run_status: "success",
				last_run_started_at: new Date("2025-01-04T10:00:00Z").toISOString(),
				last_run_ended_at: new Date("2025-01-04T10:02:30Z").toISOString(),
				run_count: 150,
				success_count: 145,
				pending_count: 2,
				failed_count: 3,
			},
			{
				name: "payment-processing",
				labels: {
					environment: "production",
					service: "worker",
					region: "us-west-2",
				},
				last_run_status: "success",
				last_run_started_at: new Date("2025-01-04T10:05:00Z").toISOString(),
				last_run_ended_at: new Date("2025-01-04T10:06:15Z").toISOString(),
				run_count: 320,
				success_count: 310,
				pending_count: 5,
				failed_count: 5,
			},
			{
				name: "data-sync-job",
				labels: {
					environment: "staging",
					service: "database",
					region: "eu-west-1",
				},
				last_run_status: "running",
				last_run_started_at: new Date("2025-01-04T10:10:00Z").toISOString(),
				last_run_ended_at: null,
				run_count: 89,
				success_count: 75,
				pending_count: 10,
				failed_count: 4,
			},
			{
				name: "email-notification",
				labels: {
					environment: "production",
					service: "worker",
					region: "us-east-1",
				},
				last_run_status: "failure",
				last_run_started_at: new Date("2025-01-04T09:55:00Z").toISOString(),
				last_run_ended_at: new Date("2025-01-04T09:55:45Z").toISOString(),
				run_count: 210,
				success_count: 180,
				pending_count: 15,
				failed_count: 15,
			},
			{
				name: "backup-process",
				labels: {
					environment: "production",
					service: "database",
					region: "us-east-1",
				},
				last_run_status: "success",
				last_run_started_at: new Date("2025-01-04T09:30:00Z").toISOString(),
				last_run_ended_at: new Date("2025-01-04T09:45:20Z").toISOString(),
				run_count: 50,
				success_count: 50,
				pending_count: 0,
				failed_count: 0,
			},
		];

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

		return FlowsAPI.get<FlowsApiResponse>(
			`flows/${encodeURIComponent(tenant)}`,
			{
				params,
				meta: { action: "fetch", resource: "flows" },
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

	/**
	 * Get detailed flow (flow metadata + history)
	 */
	getDetailedFlow: async (
		_tenant: string,
		flowName: string,
		_start: Date,
		_end: Date,
		_filters?: Filter[],
	): Promise<{ data: DetailedFlow }> => {
		// TODO: Remove dummy data when backend is ready
		// Simulate network delay for testing loading states
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Generate dummy flow data
		const dummyFlowData: FlowApiResponse = {
			name: flowName,
			labels: {
				environment: "production",
				service: "api",
				region: "us-east-1",
			},
			last_run_status: "success",
			last_run_started_at: new Date("2025-01-04T10:00:00Z").toISOString(),
			last_run_ended_at: new Date("2025-01-04T10:02:30Z").toISOString(),
			run_count: 150,
			success_count: 145,
			pending_count: 2,
			failed_count: 3,
		};

		// Generate dummy history data
		const dummyHistoryData = generateDummyFlowHistories();

		// Convert to frontend types
		const flow = toFlow(dummyFlowData);
		const histories = toFlowHistory(dummyHistoryData);

		const detailedFlow: DetailedFlow = {
			...flow,
			histories,
		};

		return { data: detailedFlow };

		/* Uncomment when backend is ready
		const params: Record<string, string> = {};
		params.from = start.toISOString();
		params.to = end.toISOString();

		if (filters && filters.length > 0) {
			params.filters = JSON.stringify(filters);
		}

		return FlowsAPI.get<DetailedFlowApiResponse>(
			`flows/${encodeURIComponent(tenant)}/${encodeURIComponent(flowName)}/detailed`,
			{
				params,
				meta: { action: "fetch", resource: "detailed-flow" },
			},
		);
		*/
	},

	getLastFlow: async (
		_tenant: string,
		flowName: string,
		_start: Date,
		_end: Date,
		_filters?: Filter[],
	): Promise<FlowHistory> => {
		return new Promise((resolve) =>
			setTimeout(
				() =>
					resolve({
						startTime: new Date(),
						endTime: new Date(),
						status: "success",
						events: [],
						steps: [],
						labels: {},
					}),
				1500,
			),
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
