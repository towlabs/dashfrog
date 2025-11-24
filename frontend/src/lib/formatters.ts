import {
	differenceInMilliseconds,
	differenceInSeconds,
	format,
} from "date-fns";

/**
 * Format duration between two dates
 */
export function formatDuration({
	seconds,
	startTime,
	endTime,
}: {
	seconds?: number | null;
	startTime?: Date | null;
	endTime?: Date | null;
}): string {
	if (!seconds) {
		if (!startTime || !endTime) {
			return "-";
		}
		seconds = differenceInSeconds(endTime, startTime);
	}
	seconds = Math.round(seconds);

	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 1) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

/**
 * Format time ago with human-friendly text
 * - Below 1 minute: "x seconds ago"
 * - Below 1 hour: "x minutes ago"
 * - Below 1 day: "x hours and y minutes ago"
 * - Otherwise: Full formatted date
 */
export function formatTimeAgo(date: Date): string {
	const now = new Date();
	const secondsAgo = differenceInSeconds(now, date);
	const minutesAgo = Math.floor(secondsAgo / 60);
	const hoursAgo = Math.floor(minutesAgo / 60);

	if (secondsAgo < 60) {
		return `${secondsAgo} seconds ago`;
	}
	if (minutesAgo < 60) {
		return `${minutesAgo} minutes ago`;
	}
	if (hoursAgo < 24) {
		const remainingMinutes = minutesAgo % 60;
		return `${hoursAgo} hours and ${remainingMinutes} minutes ago`;
	}
	return format(date, "PPp");
}
