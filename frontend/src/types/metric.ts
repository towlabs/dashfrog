export interface MetricValue {
	labels: Record<string, string>;
	value: number;
}

export type RangeAggregation =
	| "ratePerSecond"
	| "ratePerMinute"
	| "ratePerHour"
	| "ratePerDay"
	| "p50"
	| "p90"
	| "p95"
	| "p99";
export type InstantAggregation =
	| "ratePerSecond"
	| "ratePerMinute"
	| "ratePerHour"
	| "ratePerDay"
	| "p50"
	| "p90"
	| "p95"
	| "p99"
	| "increase";

export interface RangeMetric {
	name: string;
	prometheusName: string;
	prettyName: string;
	labels: string[];
	unit: string | null;
	type: "counter" | "histogram";
	aggregation: RangeAggregation;
	show: ("last" | "avg")[];
}

export interface InstantMetric {
	name: string;
	prometheusName: string;
	prettyName: string;
	labels: string[];
	unit: string | null;
	type: "counter" | "histogram";
	aggregation: InstantAggregation;
	rangeAggregation: RangeAggregation;
	show: ("last" | "avg")[];
}

export interface MetricHistory {
	timestamp: Date;
	value: number;
}
