import { NewRestAPI } from "@/src/services/api/_helper";
import type { ApiFilter } from "@/src/types/filter";
import type {
	Event,
	EventCreateInput,
	EventKind,
	EventsStore,
} from "@/src/types/timeline";

const EventsAPI = NewRestAPI(`api`);

/**
 * Raw event response from backend API (snake_case)
 * This is internal to the API service and converted to Event (camelCase)
 */
interface EventApiResponse {
	id: number;
	title: string;
	description: string | null;
	kind: EventKind;
	labels: Record<string, string>;
	started_at: string;
	ended_at: string;
}

type EventsApiResponse = EventApiResponse[];

/**
 * Raw event create payload for backend API (snake_case)
 */
interface EventCreateApiPayload {
	title: string;
	description?: string | null;
	kind: string;
	labels?: Record<string, string>;
	started_at: string;
	ended_at: string;
}

/**
 * Convert backend API response to frontend Event type
 * Transforms snake_case to camelCase
 */
function toEvent(apiEvent: EventApiResponse): Event {
	return {
		id: apiEvent.id,
		title: apiEvent.title,
		description: apiEvent.description,
		kind: apiEvent.kind,
		labels: apiEvent.labels,
		startedAt: apiEvent.started_at,
		endedAt: apiEvent.ended_at,
	};
}

/**
 * Convert frontend EventCreateInput to backend API payload
 * Transforms camelCase to snake_case
 */
function toEventCreatePayload(input: EventCreateInput): EventCreateApiPayload {
	return {
		title: input.title,
		description: input.description,
		kind: input.kind,
		labels: input.labels || {},
		started_at: input.startedAt,
		ended_at: input.endedAt,
	};
}

/**
 * Process events from API into indexed store
 * Converts API response format to JavaScript conventions
 */
function processEvents(apiEvents: EventApiResponse[]): EventsStore {
	const store: EventsStore = {};

	apiEvents.forEach((apiEvent) => {
		const event = toEvent(apiEvent);
		store[event.id] = event;
	});

	return store;
}

const Events = {
	/**
	 * Get all events (no filtering)
	 */
	getAll: () => {
		return EventsAPI.get<EventsApiResponse>("events", {
			meta: { action: "fetch", resource: "events" },
		});
	},

	/**
	 * Search events with filters
	 * Uses POST /events/search to support label filtering
	 */
	search: (filters?: ApiFilter[]) => {
		if (filters && filters.length > 0) {
			return EventsAPI.post<EventsApiResponse>("events/search", {
				data: { filters },
				meta: { action: "search", resource: "events" },
			});
		}
		// If no filters, use GET endpoint
		return EventsAPI.get<EventsApiResponse>("events", {
			meta: { action: "fetch", resource: "events" },
		});
	},

	/**
	 * Create a new event
	 */
	create: (input: EventCreateInput) => {
		const payload = toEventCreatePayload(input);
		return EventsAPI.post<EventApiResponse>("events", {
			data: payload,
			meta: { action: "create", resource: "event" },
		});
	},

	/**
	 * Update an existing event
	 */
	update: (id: number, input: EventCreateInput) => {
		const payload = toEventCreatePayload(input);
		return EventsAPI.put<EventApiResponse>(`events/${id}`, {
			data: payload,
			meta: { action: "update", resource: "event" },
		});
	},
};

export { EventsAPI, Events, processEvents, toEvent };
