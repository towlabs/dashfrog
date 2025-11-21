import { NewRestAPI } from "@/src/services/api/_helper";
import type { Filter } from "@/src/types/filter";
import {
	type AggregationFunction,
	getMetricAggregationLabel,
	type Metric,
	type MetricAggregation,
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

export type MetricScalarResponse = {
	scalars: {
		labels: Record<string, string>;
		value: number;
	}[];
};

const Metrics = {
	/**
	 * Get metrics for a specific tenant with optional time range and filters
	 */
	list: async () => {
		const response = await fetch(`/api/metrics/search`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
		const data = (await response.json()).map((m: Metric) => ({
			...m,
			prettyName: `${getMetricAggregationLabel(m.aggregation, m.prettyName)}`,
		})) as Metric[];
		return data;
	},

	/**
	 * Get metric history for a specific metric with labels
	 */
	getHistory: async (
		tenant: string,
		metricName: string,
		spatialAggregation: MetricAggregation,
		startTime: Date,
		endTime: Date,
		labels: Filter[],
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
				spatial_aggregation: spatialAggregation,
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

	getScalars: async (
		tenant: string,
		metricName: string,
		startTime: Date,
		endTime: Date,
		spatialAggregation: MetricAggregation,
		temporalAggregation: AggregationFunction,
		labels: Filter[],
	): Promise<MetricScalarResponse> => {
		const response = await fetch(`/api/metrics/instant`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				metric_name: metricName,
				spatial_aggregation: spatialAggregation,
				temporal_aggregation: temporalAggregation,
				start_time: startTime.toISOString(),
				end_time: endTime.toISOString(),
				labels: [...labels, { label: "tenant", value: tenant }],
			}),
		});
		const data = (await response.json()) as MetricScalarResponse;
		return data;
	},
};

export { MetricsAPI, Metrics };
