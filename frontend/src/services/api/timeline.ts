import type { Filter } from "@/src/types/filter";
import type { TimelineEvent } from "@/src/types/timeline";

/**
 * Raw timeline event response from backend API (snake_case)
 * This is internal to the API service and converted to TimelineEvent (camelCase)
 */
interface TimelineEventApiResponse {
	id: number;
	name: string;
	emoji: string;
	markdown: string;
	eventDt: string; // ISO date string from backend
	labels: Record<string, string>;
}

type TimelineApiResponse = TimelineEventApiResponse[];

/**
 * Convert backend API response to frontend TimelineEvent type
 * Transforms snake_case to camelCase and converts date string to Date object
 */
function toTimelineEvent(apiEvent: TimelineEventApiResponse): TimelineEvent {
	return {
		...apiEvent,
		eventDt: new Date(apiEvent.eventDt),
	};
}

/**
 * Process timeline events from API
 * Converts API response format to JavaScript conventions
 */
function _processTimelineEvents(
	apiEvents: TimelineEventApiResponse[],
): TimelineEvent[] {
	return apiEvents.map((apiEvent) => toTimelineEvent(apiEvent));
}

const Timeline = {
	/**
	 * Get timeline events for a specific tenant with optional time range and filters
	 */
	getByTenant: async (
		tenant: string,
		start: Date,
		end: Date,
		labels: Filter[],
	) => {
		const response = await fetch(`/api/timeline/events`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				tenant,
				start: start.toISOString(),
				end: end.toISOString(),
				labels,
			}),
		});
		const data = (await response.json()) as TimelineApiResponse;
		return data.map(toTimelineEvent);
	},
};

export { Timeline };
