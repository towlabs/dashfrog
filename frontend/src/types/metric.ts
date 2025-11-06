export interface MetricValue {
	labels: Record<string, string>;
	value: number;
}

export type MetricAggregation =
	| "sum"
	| "avg"
	| "min"
	| "max"
	| "p50"
	| "p90"
	| "p95"
	| "p99"
	| "ratePerSecond"
	| "ratePerMinute"
	| "ratePerHour"
	| "ratePerDay";

export const MetricAggregationLabel: Record<MetricAggregation, string> = {
	sum: "Total",
	avg: "Average",
	min: "Minimum",
	max: "Maximum",
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
	name: string;
	prometheusName: string;
	timestamp: Date;
	labels: Record<string, string>;
	value: number;
	unit: string;
	aggregation: MetricAggregation;
}
