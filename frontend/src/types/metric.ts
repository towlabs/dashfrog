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
	| "ratio";
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
