import {
	endOfWeek,
	startOfWeek,
	subDays,
	subHours,
	subMinutes,
} from "date-fns";

export type RelativeTimeValue =
	| "15m"
	| "1h"
	| "6h"
	| "12h"
	| "24h"
	| "7d"
	| "30d"
	| "w";

export type TimeWindow =
	| { type: "relative"; metadata: { value: RelativeTimeValue } }
	| { type: "absolute"; metadata: { start: Date; end: Date } };

/**
 * Convert a TimeWindow to actual start/end dates
 */
export function resolveTimeWindow(timeWindow: TimeWindow): {
	start: Date;
	end: Date;
} {
	if (timeWindow.type === "absolute") {
		return {
			start: timeWindow.metadata.start,
			end: timeWindow.metadata.end,
		};
	}

	const now = new Date();
	const { value } = timeWindow.metadata;

	switch (value) {
		case "15m":
			return { start: subMinutes(now, 15), end: now };
		case "1h":
			return { start: subHours(now, 1), end: now };
		case "6h":
			return { start: subHours(now, 6), end: now };
		case "12h":
			return { start: subHours(now, 12), end: now };
		case "24h":
			return { start: subHours(now, 24), end: now };
		case "7d":
			return { start: subDays(now, 7), end: now };
		case "30d":
			return { start: subDays(now, 30), end: now };
		case "w":
			return {
				start: startOfWeek(now, { weekStartsOn: 0 }),
				end: endOfWeek(now, { weekStartsOn: 0 }),
			};
		default:
			return { start: subHours(now, 24), end: now };
	}
}
