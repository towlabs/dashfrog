import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { Events, processEvents, toEvent } from "@/src/services/api/events";
import type { Event, EventCreateInput, EventsStore } from "@/src/types/event";
import type { ApiFilter } from "@/src/types/filter";

interface EventsContextType {
	events: EventsStore;
	loading: boolean;
	error: string | null;
	refreshEvents: (filters?: ApiFilter[]) => Promise<void>;
	createEvent: (input: EventCreateInput) => Promise<Event>;
	updateEvent: (id: number, input: EventCreateInput) => Promise<Event>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: React.ReactNode }) {
	const [events, setEvents] = useState<EventsStore>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchEvents = useCallback(async (filters?: ApiFilter[]) => {
		try {
			setLoading(true);
			setError(null);
			const response = await Events.search(filters);
			const processedEvents = processEvents(response.data);
			setEvents(processedEvents);
		} catch (err) {
			console.error("Failed to fetch events:", err);
			setError("Failed to load events");
			setEvents({});
		} finally {
			setLoading(false);
		}
	}, []);

	// Load events on mount (no filters)
	useEffect(() => {
		void fetchEvents();
	}, [fetchEvents]);

	/**
	 * Create a new event and update local state
	 */
	const createEvent = async (input: EventCreateInput): Promise<Event> => {
		try {
			setError(null);
			const response = await Events.create(input);
			const newEvent = toEvent(response.data);

			// Update local state immediately
			setEvents((prev) => ({
				...prev,
				[newEvent.id]: newEvent,
			}));

			return newEvent;
		} catch (err) {
			console.error("Failed to create event:", err);
			setError("Failed to create event");
			throw err;
		}
	};

	/**
	 * Update an existing event and update local state
	 */
	const updateEvent = async (
		id: number,
		input: EventCreateInput,
	): Promise<Event> => {
		try {
			setError(null);
			const response = await Events.update(id, input);
			const updatedEvent = toEvent(response.data);

			// Update local state immediately
			setEvents((prev) => ({
				...prev,
				[updatedEvent.id]: updatedEvent,
			}));

			return updatedEvent;
		} catch (err) {
			console.error("Failed to update event:", err);
			setError("Failed to update event");
			throw err;
		}
	};

	const value: EventsContextType = {
		events,
		loading,
		error,
		refreshEvents: fetchEvents,
		createEvent,
		updateEvent,
	};

	return (
		<EventsContext.Provider value={value}>{children}</EventsContext.Provider>
	);
}

export function useEvents() {
	const context = useContext(EventsContext);
	if (context === undefined) {
		throw new Error("useEvents must be used within an EventsProvider");
	}
	return context;
}
