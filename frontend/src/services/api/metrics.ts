import { NewRestAPI } from "@/src/services/api/_helper";
import type { Filter } from "@/src/types/filter";
import {
	GroupBy,
	InstantMetric,
	RangeMetric,
	TimeAggregation,
	Transform,
} from "@/src/types/metric";

const MetricsAPI = NewRestAPI(`api`);

/**
 * Metric history data point
 */
export type MetricHistoryPoint = {
	timestamp: Date;
	value: number;
};

export type MetricHistoryResponse = {
	series: {
		labels: Record<string, string>;
		values: {
			timestamp: string;
			value: number;
		}[];
	}[];
};

const Metrics = {
	/**
	 * Get metrics for a specific tenant with optional time range and filters
	 */
	list: async (): Promise<{
		instant: InstantMetric[];
		range: RangeMetric[];
	}> => {
		const response = await fetch(`/api/metrics/search`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
		const data = await response.json();

		return data;
	},

	/**
	 * Get metric history for a specific metric with labels
	 */
	getHistory: async (
		tenant: string,
		metricName: string,
		transform: Transform | null,
		startTime: Date,
		endTime: Date,
		labels: Filter[],
		groupBy: string[],
		groupByFn: GroupBy,
	): Promise<{
		series: { labels: Record<string, string>; values: MetricHistoryPoint[] }[];
	}> => {
		const response = await fetch(`/api/metrics/range`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				metric_name: metricName,
				transform,
				group_by: groupBy,
				group_fn: groupByFn,
				start_time: startTime.toISOString(),
				end_time: endTime.toISOString(),
				labels: [...labels, { label: "tenant", value: tenant }],
			}),
		});
		const data = (await response.json()) as MetricHistoryResponse;
		return {
			series: data.series.map((series) => ({
				labels: series.labels,
				values: series.values.map((value) => ({
					timestamp: new Date(value.timestamp),
					value: value.value,
				})),
			})),
		};
	},

	getScalar: async (
		tenant: string,
		metricName: string,
		startTime: Date,
		endTime: Date,
		transform: Transform | null,
		groupBy: string[],
		groupByFn: GroupBy,
		timeAggregation: TimeAggregation,
		matchOperator: "==" | ">" | "<" | ">=" | "<=" | "!=" | null,
		matchValue: string | null,
		labels: Filter[],
	): Promise<{
		scalars: { labels: Record<string, string>; value: number }[];
	}> => {
		const payload: Record<string, any> = {
			metric_name: metricName,
			transform,
			group_by: groupBy,
			group_fn: groupByFn,
			time_aggregation: timeAggregation,
			start_time: startTime.toISOString(),
			end_time: endTime.toISOString(),
			labels: [...labels, { label: "tenant", value: tenant }],
		};
		if (timeAggregation === "match") {
			payload.match_operator = matchOperator;
			payload.match_value = matchValue;
		}
		const response = await fetch(`/api/metrics/instant`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});
		const data = (await response.json()) as {
			scalars: { labels: Record<string, string>; value: number }[];
		};
		return data;
	},
};

export { MetricsAPI, Metrics };
