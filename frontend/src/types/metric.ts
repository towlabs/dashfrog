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
export type Show = "last" | "avg" | "min" | "max";

export interface RangeMetric {
	name: string;
	prometheusName: string;
	prettyName: string;
	labels: string[];
	unit: string | null;
	type: "counter" | "histogram";
	aggregation: RangeAggregation;
	show: Show[];
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
	show: Show[];
}

export interface MetricHistory {
	timestamp: Date;
	value: number;
}
