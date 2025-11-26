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
	| "p99";
export type TimeAggregation = "last" | "avg" | "min" | "max" | "match";
export type GroupByFn = "sum" | "avg" | "min" | "max";
export type MetricType = "counter" | "histogram" | "gauge";

export interface RangeMetric {
	name: string;
	prometheusName: string;
	prettyName: string;
	labels: string[];
	unit: string | null;
	type: MetricType;
	transform: Transform | null;
	groupBy: GroupByFn[];
}

export interface InstantMetric {
	name: string;
	prometheusName: string;
	prettyName: string;
	labels: string[];
	unit: string | null;
	type: MetricType;
	transform: Transform | null;
	groupBy: GroupByFn[];
	timeAggregation: TimeAggregation[];
}

export interface MetricHistory {
	timestamp: Date;
	value: number;
}
