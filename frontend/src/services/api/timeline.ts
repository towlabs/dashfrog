import type { Filter } from "@/src/types/filter";
import type { TimelineEvent } from "@/src/types/timeline";
import { Block } from "@blocknote/core/types/src/blocks";
import { parseJSON } from "date-fns";

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
	blocks: Block[] | null;
}

type TimelineApiResponse = TimelineEventApiResponse[];

/**
 * Convert backend API response to frontend TimelineEvent type
 * Transforms snake_case to camelCase and converts date string to Date object
 */
function toTimelineEvent(apiEvent: TimelineEventApiResponse): TimelineEvent {
	return {
		...apiEvent,
		eventDt: parseJSON(apiEvent.eventDt),
	};
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

	update: async (event: TimelineEvent, blocks: Block[]) => {
		await fetch(`/api/timeline/${event.id}/blocks`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ blocks }),
		});
	},
};

export { Timeline };
