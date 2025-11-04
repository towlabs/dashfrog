import { NewRestAPI } from "@/src/services/api/_helper";
import type { ApiFilter, Filter } from "@/src/types/filter";
import type { TimelineEvent } from "@/src/types/timeline";

const TimelineAPI = NewRestAPI(`api`);

/**
 * Raw timeline event response from backend API (snake_case)
 * This is internal to the API service and converted to TimelineEvent (camelCase)
 */
interface TimelineEventApiResponse {
	name: string;
	description: string;
	event_dt: string; // ISO date string from backend
}

type TimelineApiResponse = TimelineEventApiResponse[];

/**
 * Convert backend API response to frontend TimelineEvent type
 * Transforms snake_case to camelCase and converts date string to Date object
 */
function toTimelineEvent(apiEvent: TimelineEventApiResponse): TimelineEvent {
	return {
		name: apiEvent.name,
		description: apiEvent.description,
		eventDt: new Date(apiEvent.event_dt),
	};
}

/**
 * Process timeline events from API
 * Converts API response format to JavaScript conventions
 */
function processTimelineEvents(
	apiEvents: TimelineEventApiResponse[],
): TimelineEvent[] {
	return apiEvents.map((apiEvent) => toTimelineEvent(apiEvent));
}

/**
 * Convert Filter to ApiFilter format for backend
 */
function toApiFilter(filter: Filter): ApiFilter {
	return {
		key: filter.label,
		operator: filter.operator,
		value: filter.value,
		is_label: true,
	};
}

const Timeline = {
	/**
	 * Get timeline events for a specific tenant with optional time range and filters
	 */
	getByTenant: (tenant: string, start: Date, end: Date, filters?: Filter[]) => {
		const params: Record<string, string> = {};

		// Add time range if provided
		if (start && end) {
			params.from = start.toISOString();
			params.to = end.toISOString();
		}

		// Convert filters to API format if provided
		const apiFilters = filters ? filters.map(toApiFilter) : undefined;

		// Use POST if we have filters, otherwise GET
		if (apiFilters && apiFilters.length > 0) {
			return TimelineAPI.post<TimelineApiResponse>(
				`timeline/${encodeURIComponent(tenant)}/search`,
				{
					data: { filters: apiFilters, ...params },
					meta: { action: "search", resource: "timeline" },
				},
			);
		}

		return TimelineAPI.get<TimelineApiResponse>(
			`timeline/${encodeURIComponent(tenant)}`,
			{
				params,
				meta: { action: "fetch", resource: "timeline" },
			},
		);
	},
};

export { TimelineAPI, Timeline, processTimelineEvents, toTimelineEvent };
