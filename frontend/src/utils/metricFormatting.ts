import { InstantAggregation, RangeAggregation } from "../types/metric";

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
	aggregation?: InstantAggregation | RangeAggregation,
): { formattedValue: string; displayUnit: string } {
	let displayValue = value;
	let displayUnit = "";

	// Handle percentage (expecting 0-1 range)
	if (unit === "percent" || unit === "%") {
		const percentage = value * 100;
		const rounded = roundToMax2(percentage);
		return {
			formattedValue: rounded.toLocaleString(),
			displayUnit: "%",
		};
	}

	// Handle bytes - convert to GB
	if (unit === "bytes") {
		displayValue = value / 1024 / 1024 / 1024;
		displayUnit = "GB";
	}
	// Handle seconds
	else if (unit === "seconds" || unit === "s") {
		displayUnit = "s";
	}
	// Handle other units
	else if (unit && unit !== "count") {
		displayUnit = unit;
	}

	// Handle rate aggregations
	if (aggregation?.startsWith("rate")) {
		if (aggregation === "ratePerSecond") {
			displayUnit = `${unit || "events"}/s`;
		} else if (aggregation === "ratePerMinute") {
			displayUnit = `${unit || "events"}/min`;
		} else if (aggregation === "ratePerHour") {
			displayUnit = `${unit || "events"}/h`;
		} else if (aggregation === "ratePerDay") {
			displayUnit = `${unit || "events"}/day`;
		}
	}

	const rounded = roundToMax2(displayValue);
	return {
		formattedValue: rounded.toLocaleString(),
		displayUnit,
	};
}
