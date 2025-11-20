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

export const getMetricAggregationLabel = (
	aggregation: MetricAggregation,
	prettyName: string,
) => {
	switch (aggregation) {
		case "p50":
		case "p90":
		case "p95":
		case "p99":
		case "increase":
			return `${aggregation} of ${prettyName}`;
		case "ratePerSecond":
			return `Rate of ${prettyName} per second`;
		case "ratePerMinute":
			return `Rate of ${prettyName} per minute`;
		case "ratePerHour":
			return `Rate of ${prettyName} per hour`;
		case "ratePerDay":
			return `Rate of ${prettyName} per day`;
		default:
			return prettyName;
	}
};

export type AggregationFunction = "last" | "sum" | "avg";

export interface Metric {
	name: string;
	prometheusName: string;
	prettyName: string;
	labels: string[];
	unit: string | null;
	aggregation: MetricAggregation;
	type: "counter" | "histogram";
}

export interface MetricHistory {
	timestamp: Date;
	value: number;
}
