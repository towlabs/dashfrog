/**
 * Metric Types
 *
 * This file contains all type definitions related to metrics.
 * Metrics represent measurements and data points collected from the system.
 *
 * All types follow JavaScript naming conventions (camelCase).
 * API response conversion happens in the API service layer.
 */

/**
 * Metric types (matches backend Kind enum)
 * other comes from OTEL direct metrics not managed by SDK
 */
export type MetricKind = "events" | "values" | "distribution";

/**
 * custom is used to indicate that metrics comes for user.
 * UNKNOWN stands for metrics from unmanaged OTEL sources
 * that don't match any supported scope.
 */
export type MetricScope =
	| "api"
	| "tasks"
	| "workflow"
	| "custom"
	| "UNKNOW"
	| string;

export type MetricUnits =
	| "seconds"
	| "milliseconds"
	| "microseconds"
	| "nanoseconds"
	| "bytes"
	| "kilobytes"
	| "megabytes"
	| "gigabytes"
	| "ratio"
	| "percent"
	| "count"
	| "requests"
	| string;

/**
 * Metric data structure (JavaScript conventions)
 *
 * This is the canonical metric type used throughout the application.
 * API services convert backend responses to this format.
 */
export interface Metric<KindT extends MetricKind = MetricKind> {
	/** Unique metric ID from backend */
	id: number;
	/** Metric key/name as it appears in the system */
	key: string;
	/** Type of metric (counter, gauge, etc.) */
	kind: KindT;
	/** Scope of the metric (common: api, tasks, workflow) */
	scope: MetricScope;
	/** Unit of measurement (e.g., bytes, seconds, count) */
	unit: MetricUnits;
	/** Human-readable display name for the metric */
	displayAs: string;
	/** Description explaining what this metric measures */
	description: string;
	/** Prometheus name of the metric */
	prometheusName: string;
	/** List of associated identifiers */
	prometheusMetricName: string;
	/** List of label names */
	labels: string[];
}

/**
 * Store structure for efficient metric lookups
 * Maps metric IDs to their data
 */
export interface MetricsStore {
	[metricId: number]: Metric<MetricKind>;
}

/**
 * Aggregation functions for metrics
 */
export type Aggregation =
	| "avg"
	| "min"
	| "max"
	| "sum"
	| "p50"
	| "p90"
	| "p95"
	| "p99";

/**
 * Type-level mapping from metric kind to allowed aggregation type
 */
type KindAggregationMap = {
	events: "sum";
	values: "avg" | "min" | "max";
	distribution: "p50" | "p90" | "p95" | "p99";
};

export type AggregationForKind<K extends MetricKind> = KindAggregationMap[K];

/**
 * Runtime mapping of allowed aggregations for each kind
 */
export const allowedAggregationsByKind: Record<MetricKind, Aggregation[]> = {
	events: ["sum"],
	values: ["avg", "min", "max"],
	distribution: ["p50", "p90", "p95", "p99"],
};
