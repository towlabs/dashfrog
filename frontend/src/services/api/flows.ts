import { parseJSON } from "date-fns";
import type { Filter } from "@/src/types/filter";
import type {
	Flow,
	FlowHistory,
	FlowHistoryEvent,
	FlowHistoryStep,
	FlowRunCount,
	StaticFlow,
} from "@/src/types/flow";

/**
 * Raw flow response from backend API (snake_case)
 */
interface FlowApiResponse {
	groupId: string;
	name: string;
	labels: Record<string, string>;
	lastRunStatus: "success" | "failure" | "running";
	lastRunStartedAt: string;
	lastRunEndedAt: string | null;
	runCount: number;
	successCount: number;
	pendingCount: number;
	failedCount: number;
	lastDurationInSeconds: number | null;
	avgDurationInSeconds: number | null;
	minDurationInSeconds: number | null;
	maxDurationInSeconds: number | null;
}

interface FlowDetailsApiResponse {
	history: {
		groupId: string;
		status: "success" | "failure" | "running";
		flowId: string;
		startTime: string;
		endTime: string | null;
		events: FlowHistoryEventApiResponse[];
		steps: FlowHistoryStepApiResponse[];
		labels: Record<string, string>;
	}[];
}

/**
 * Raw flow history event response from backend API (snake_case)
 */
interface FlowHistoryEventApiResponse {
	eventName: string;
	eventDt: string; // ISO date string
}

/**
 * Raw flow history step response from backend API (snake_case)
 */
interface FlowHistoryStepApiResponse {
	name: string;
	startTime: string; // ISO date string
	endTime: string | null; // ISO date string
	status: "success" | "failure" | "running";
}

/**
 * Convert backend API response to frontend Flow type
 */
function toFlow(apiFlow: FlowApiResponse): Flow {
	return {
		...apiFlow,
		lastRunStartedAt: parseJSON(apiFlow.lastRunStartedAt),
		lastRunEndedAt: apiFlow.lastRunEndedAt
			? parseJSON(apiFlow.lastRunEndedAt)
			: null,
	};
}

/**
 * Convert backend API response to frontend FlowHistoryEvent type
 */
function toFlowHistoryEvent(
	apiEvent: FlowHistoryEventApiResponse,
): FlowHistoryEvent {
	return {
		...apiEvent,
		eventDt: parseJSON(apiEvent.eventDt),
	};
}

/**
 * Convert backend API response to frontend FlowHistoryStep type
 */
function toFlowHistoryStep(
	apiStep: FlowHistoryStepApiResponse,
): FlowHistoryStep {
	return {
		...apiStep,
		startTime: parseJSON(apiStep.startTime),
		endTime: apiStep.endTime ? parseJSON(apiStep.endTime) : null,
	};
}

/**
 * Convert backend API response to frontend FlowHistory type
 */
function toFlowHistory(
	apiFlowHistory: FlowDetailsApiResponse["history"],
): FlowHistory[] {
	return apiFlowHistory.map((h) => ({
		...h,
		startTime: parseJSON(h.startTime),
		endTime: h.endTime ? parseJSON(h.endTime) : null,
		events: h.events.map(toFlowHistoryEvent),
		steps: h.steps.map(toFlowHistoryStep),
	}));
}

const Flows = {
	/**
	 * Get flows for a specific tenant with optional time range and filters
	 */
	getByTenant: async (
		tenant: string,
		start: Date,
		end: Date,
		labels: Filter[],
	) => {
		const response = await fetch(`/api/flows/search`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				start: start.toISOString(),
				end: end.toISOString(),
				tenant,
				labels,
			}),
		});
		const data = (await response.json()) as FlowApiResponse[];
		return data.map(toFlow);
	},

	/**
	 * Get flow history
	 */
	getFlowHistory: async (
		tenant: string,
		flowName: string,
		start: Date,
		end: Date,
		labels: Filter[],
	): Promise<FlowHistory[]> => {
		const response = await fetch(`/api/flows/history`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				flow_name: flowName,
				start: start.toISOString(),
				end: end.toISOString(),
				labels,
				tenant,
			}),
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch flow details: ${response.statusText}`);
		}
		const data = (await response.json()) as FlowDetailsApiResponse;
		return toFlowHistory(data.history);
	},

	list: async (): Promise<StaticFlow[]> => {
		const response = await fetch(`/api/flows/`);
		const data = await response.json();
		return data;
	},
};

export { Flows, toFlow, toFlowHistory, toFlowHistoryEvent, toFlowHistoryStep };
