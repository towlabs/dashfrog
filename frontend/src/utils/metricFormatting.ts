import type { Transform } from "../types/metric";

/**
 * Round a number to a maximum of 2 decimal places (not fixed)
 */
export function roundToMax2(num: number): number {
	if (num === 0) return 0;
	const magnitude = Math.floor(Math.log10(Math.abs(num)));
	const decimals = Math.max(0, 2 - magnitude - 1);
	return Number(num.toFixed(decimals));
}

/**
 * Format a metric value based on its unit and aggregation type
 */
export function formatMetricValue(
	value: number,
	unit?: string,
	transform?: Transform | null,
): { formattedValue: string; displayUnit: string } {
	const displayValue = value;
	let displayUnit = unit || "";

	// Handle percentage (expecting 0-1 range)
	if (unit === "percent" || unit === "%") {
		const percentage = value * 100;
		const rounded = roundToMax2(percentage);
		return {
			formattedValue: rounded.toLocaleString(),
			displayUnit: "%",
		};
	}

	// Handle rate aggregations
	if (transform?.startsWith("rate")) {
		if (transform === "ratePerSecond") {
			displayUnit = `${unit || "events"}/s`;
		} else if (transform === "ratePerMinute") {
			displayUnit = `${unit || "events"}/min`;
		} else if (transform === "ratePerHour") {
			displayUnit = `${unit || "events"}/h`;
		} else if (transform === "ratePerDay") {
			displayUnit = `${unit || "events"}/day`;
		}
	}

	const rounded = roundToMax2(displayValue);
	return {
		formattedValue: rounded.toLocaleString(),
		displayUnit,
	};
}
