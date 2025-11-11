export interface MetricValue {
	labels: Record<string, string>;
	value: number;
}

export type MetricAggregation =
	| "increase"
	| "p50"
	| "p90"
	| "p95"
	| "p99"
	| "ratePerSecond"
	| "ratePerMinute"
	| "ratePerHour"
	| "ratePerDay";

export const MetricAggregationLabel: Record<MetricAggregation, string> = {
	increase: "Increase",
	p50: "50th Percentile",
	p90: "90th Percentile",
	p95: "95th Percentile",
	p99: "99th Percentile",
	ratePerSecond: "Rate",
	ratePerMinute: "Rate",
	ratePerHour: "Rate",
	ratePerDay: "Rate",
};

export interface Metric {
	name: string;
	prometheusName: string;
	unit: string | null;
	values: MetricValue[];
	aggregation: MetricAggregation;
}

export interface MetricHistory {
	timestamp: Date;
	value: number;
}
