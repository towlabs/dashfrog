/**
 * Event Types
 *
 * This file contains all type definitions related to events.
 * Events represent incidents and maintenance periods in the system.
 *
 * All types follow JavaScript naming conventions (camelCase).
 * API response conversion happens in the API service layer.
 */

/**
 * Event kinds (matches backend Kind enum)
 */
export type EventKind = "incident" | "maintenance";

/**
 * Event data structure (JavaScript conventions)
 *
 * This is the canonical event type used throughout the application.
 * API services convert backend responses to this format.
 */
export interface Event {
	/** Unique identifier for the event */
	id: number;
	/** Event title/name */
	title: string;
	/** Optional description providing details about the event */
	description: string | null;
	/** Type of event (incident or maintenance) */
	kind: EventKind;
	/** Key-value labels associated with this event */
	labels: Record<string, string>;
	/** When the event started (ISO datetime string) */
	startedAt: string;
	/** When the event ended (ISO datetime string) */
	endedAt: string;
}

/**
 * Input type for creating a new event
 * Used when posting to the API
 */
export interface EventCreateInput {
	/** Event title/name */
	title: string;
	/** Optional description providing details about the event */
	description?: string | null;
	/** Type of event (incident or maintenance) */
	kind: EventKind;
	/** Key-value labels associated with this event */
	labels?: Record<string, string>;
	/** When the event started (ISO datetime string) */
	startedAt: string;
	/** When the event ended (ISO datetime string) */
	endedAt: string;
}

/**
 * Store structure for efficient event lookups
 * Maps event IDs to their data
 */
export interface EventsStore {
	[eventId: number]: Event;
}
