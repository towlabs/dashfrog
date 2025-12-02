export interface MetricValue {
	labels: Record<string, string>;
	value: number;
}

export type Transform =
	| "ratePerSecond"
	| "ratePerMinute"
	| "ratePerHour"
	| "ratePerDay"
	| "p50"
	| "p90"
	| "p95"
	| "p99"
	| "ratio"
	| string;
export type TimeAggregation = "last" | "avg" | "min" | "max" | "match";
export type GroupByFn = "sum" | "avg" | "min" | "max";
export type MetricType = "ratio" | "histogram" | "gauge" | "increase" | "rate";

export interface Metric {
	id: string;
	prometheusName: string;
	prettyName: string;
	labels: string[];
	unit: string | null;
	type: MetricType;
	groupBy: GroupByFn[];
	timeAggregation: TimeAggregation[];
}

export interface MetricHistory {
	timestamp: Date;
	value: number;
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
