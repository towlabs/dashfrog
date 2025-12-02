/**
 * PromQL Query Builder Service
 *
 * Builds PromQL queries from metric definitions, filters, and aggregation functions.
 */

import type { Filter, FilterOperator } from "@/src/types/filter";
import type {
	AggregationForKind,
	Metric,
	MetricKind,
} from "@/src/types/metric";

/**
 * Escapes special characters in PromQL label values
 */
function escapePromQLValue(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Converts a filter operator to PromQL label matcher operator
 */
function filterOperatorToPromQL(operator: FilterOperator): string {
	switch (operator) {
		case "equals":
			return "=";
		case "not_equals":
			return "!=";
		case "contains":
			return "=~"; // Regex match
		case "not_contains":
			return "!~"; // Negative regex match
		default:
			return "=";
	}
}

/**
 * Converts a filter value to PromQL format based on operator
 */
function filterValueToPromQL(value: string, operator: FilterOperator): string {
	const escaped = escapePromQLValue(value);

	// For contains/not_contains, wrap in regex pattern
	if (operator === "contains" || operator === "not_contains") {
		return `.*${escaped}.*`;
	}

	return escaped;
}

/**
 * Computes the rate window for counter/histogram queries
 * Independent of step size - based on total time range
 */
function getRateWindow(intervalInSeconds: number): number {
	const MIN_WINDOW = 30;
	const MAX_WINDOW = 3600; // 1 hour max

	if (intervalInSeconds < 300) {
		// < 5 minutes: use full interval (but at least 30s)
		return Math.max(MIN_WINDOW, intervalInSeconds);
	}

	if (intervalInSeconds < 3600) {
		// 5m - 1h: use 1 minute
		return 60;
	}

	if (intervalInSeconds < 86400) {
		// 1h - 1d: use 5 minutes
		return 300;
	}

	if (intervalInSeconds < 604800) {
		// 1d - 1w: use 15 minutes
		return 900;
	}

	// > 1 week: use 1 hour
	return MAX_WINDOW;
}

/**
 * Builds label matchers from filters
 */
function buildLabelMatchers(filters: Filter[]): string {
	if (!filters || filters.length === 0) {
		return "";
	}

	const matchers = filters.map((filter) => {
		const op = filterOperatorToPromQL(filter.operator);
		const value = filterValueToPromQL(filter.value, filter.operator);
		return `${filter.label}${op}"${value}"`;
	});

	return matchers.join(",");
}

/**
 * Builds a PromQL query for distribution (histogram) metrics
 * Uses histogram_quantile to extract percentiles from histogram buckets
 *
 * @param metric - The distribution metric to query
 * @param filters - Label filters to apply
 * @param start - Start date for the query range
 * @param end - End date for the query range
 * @param aggregation - The percentile aggregation (p50, p90, p95, p99)
 * @param aggOverTime - If true, uses full interval; if false, uses smart window
 * @param groupBy - Labels to group by
 * @returns PromQL query string
 */
export function distributionToPromMetric(
	metric: Metric<"distribution">,
	filters: Filter[],
	start: Date,
	end: Date,
	aggregation: AggregationForKind<"distribution">,
	aggOverTime: boolean,
	groupBy: string[],
): string {
	const labelMatchers = buildLabelMatchers(filters);
	let query = labelMatchers
		? `${metric.prometheusName}{${labelMatchers}}`
		: metric.prometheusName;

	// Map percentile aggregation to quantile value
	const quantileMap: Record<AggregationForKind<"distribution">, string> = {
		p50: "0.5",
		p90: "0.9",
		p95: "0.95",
		p99: "0.99",
	};
	const quantile = quantileMap[aggregation];

	// Use interval for scalar queries, step for time series
	const intervalInSeconds = Math.floor(
		(end.getTime() - start.getTime()) / 1000,
	);
	const window = aggOverTime
		? intervalInSeconds
		: getRateWindow(intervalInSeconds);
	query = `rate(${query}[${window}s])`;

	// Aggregate by groupBy labels
	if (groupBy.length === 0) {
		query = `sum(${query})`;
	} else {
		query = `sum by (${groupBy.join(",")}) (${query})`;
	}

	// Apply histogram_quantile to extract the desired percentile
	return `histogram_quantile(${quantile}, ${query})`;
}

/**
 * Builds a PromQL query for events (counter) metrics
 * Events are monotonically increasing values, so we use increase() to calculate the total increase
 *
 * @param metric - The events metric to query
 * @param filters - Label filters to apply
 * @param start - Start date for the query range
 * @param end - End date for the query range
 * @param aggOverTime - If true, uses full interval; if false, uses smart window
 * @param groupBy - Labels to group by (null for total aggregation)
 * @returns PromQL query string
 */
export function eventsToPromMetric(
	metric: Metric<"events">,
	filters: Filter[],
	start: Date,
	end: Date,
	aggOverTime: boolean,
	groupBy: string[],
): string {
	const labelMatchers = buildLabelMatchers(filters);
	let query = labelMatchers
		? `${metric.prometheusName}{${labelMatchers}}`
		: metric.prometheusName;

	// Use interval for scalar queries, step for time series
	const intervalInSeconds = Math.floor(
		(end.getTime() - start.getTime()) / 1000,
	);
	const window = aggOverTime
		? intervalInSeconds
		: getRateWindow(intervalInSeconds);
	query = `increase(${query}[${window}s])`;

	// Aggregate by groupBy labels
	if (groupBy.length === 0) {
		return `sum(${query})`;
	}
	return `sum by (${groupBy.join(",")}) (${query})`;
}

/**
 * Builds a PromQL query for values (gauge) metrics
 * Values are point-in-time measurements that can go up or down
 *
 * @param metric - The values metric to query
 * @param filters - Label filters to apply
 * @param start - Start date for the query range
 * @param end - End date for the query range
 * @param aggregation - The aggregation function (avg, min, max)
 * @param aggOverTime - If true, aggregates over time; if false, returns time series
 * @param groupBy - Labels to group by (null for total aggregation)
 * @returns PromQL query string
 */
export function valuesToPromMetric(
	metric: Metric<"values">,
	filters: Filter[],
	start: Date,
	end: Date,
	aggregation: AggregationForKind<"values">,
	aggOverTime: boolean,
	groupBy: string[],
): string {
	const labelMatchers = buildLabelMatchers(filters);
	let query = labelMatchers
		? `${metric.prometheusName}{${labelMatchers}}`
		: metric.prometheusName;

	// SCALAR: aggregate over time FIRST, then spatially
	if (aggOverTime) {
		const intervalInSeconds = Math.floor(
			(end.getTime() - start.getTime()) / 1000,
		);
		query = `${aggregation}_over_time(${query}[${intervalInSeconds}s])`;
	}

	// TIME SERIES: spatial aggregation only
	if (groupBy.length === 0) {
		return `${aggregation}(${query})`;
	}
	return `${aggregation} by (${groupBy.join(",")}) (${query})`;
}

export function generatePromQuery<KindT extends MetricKind>(
	metric: Metric<KindT>,
	filters: Filter[],
	start: Date,
	end: Date,
	aggregation: AggregationForKind<KindT>,
	aggOverTime: boolean,
	groupBy: string[],
): string {
	switch (metric.kind) {
		case "values":
			return valuesToPromMetric(
				metric,
				filters,
				start,
				end,
				aggregation,
				aggOverTime,
				groupBy,
			);
		case "events":
			return eventsToPromMetric(
				metric,
				filters,
				start,
				end,
				aggOverTime,
				groupBy,
			);
		case "distribution":
			return distributionToPromMetric(
				metric,
				filters,
				start,
				end,
				aggregation,
				aggOverTime,
				groupBy,
			);
		default:
			throw new Error(`Unsupported metric kind: ${metric.kind}`);
	}
}
