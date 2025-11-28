import { fetchWithAuth } from "@/src/lib/fetch-wrapper";
import { NewRestAPI } from "@/src/services/api/_helper";
import type { Filter } from "@/src/types/filter";
import type {
	GroupByFn,
	InstantMetric,
	MetricType,
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
	prettyName: string;
	unit: string | null;
	transform: Transform | null;
	series: {
		labels: Record<string, string>;
		values: {
			timestamp: string;
			value: number;
		}[];
	}[];
};

export type MetricRangeHistory = {
	prettyName: string;
	unit: string | null;
	transform: Transform | null;
	series: {
		labels: Record<string, string>;
		values: {
			timestamp: Date;
			value: number;
		}[];
	}[];
};

export type MetricScalar = {
	type: MetricType;
	prettyName: string;
	unit: string | null;
	transform: Transform | null;
	scalars: { labels: Record<string, string>; value: number }[];
};

const Metrics = {
	/**
	 * Get metrics for a specific tenant with optional time range and filters
	 */
	list: async (): Promise<{
		instant: InstantMetric[];
		range: RangeMetric[];
	}> => {
		const response = await fetchWithAuth(`/api/metrics/search`, {
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
		groupByFn: GroupByFn,
		notebookId: string | null,
	): Promise<MetricRangeHistory> => {
		const response = await fetchWithAuth(`/api/metrics/range`, {
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
				notebook_id: notebookId,
			}),
		});
		const data = (await response.json()) as MetricHistoryResponse;
		return {
			prettyName: data.prettyName,
			unit: data.unit,
			transform: data.transform,
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
		groupByFn: GroupByFn,
		timeAggregation: TimeAggregation,
		matchOperator: "==" | ">" | "<" | ">=" | "<=" | "!=" | null,
		matchValue: string | null,
		labels: Filter[],
		notebookId: string,
	): Promise<MetricScalar> => {
		// biome-ignore lint/suspicious/noExplicitAny: json payload
		const payload: Record<string, any> = {
			metric_name: metricName,
			transform,
			group_by: groupBy,
			group_fn: groupByFn,
			time_aggregation: timeAggregation,
			start_time: startTime.toISOString(),
			end_time: endTime.toISOString(),
			labels: [...labels, { label: "tenant", value: tenant }],
			notebook_id: notebookId,
		};
		if (timeAggregation === "match") {
			payload.match_operator = matchOperator;
			payload.match_value = matchValue;
		}
		const response = await fetchWithAuth(`/api/metrics/instant`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});
		const data = (await response.json()) as MetricScalar;
		return data;
	},
};

export { MetricsAPI, Metrics };
