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
		_tenant: string,
		metricName: string,
		spatialAggregation: MetricAggregation,
		startTime: Date,
		endTime: Date,
		labels?: Filter[],
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
				aggregation: spatialAggregation,
				start_time: startTime.toISOString(),
				end_time: endTime.toISOString(),
				labels,
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
		_tenant: string,
		_metricName: string,
		_unit: string | null,
		_startTime: Date,
		_endTime: Date,
		_spatialAggregation: MetricAggregation,
		_temporalAggregation: AggregationFunction,
		_filters?: Filter[],
	): Promise<MetricScalarResponse> => {
		return new Promise((resolve) => setTimeout(resolve, 300)).then(() => ({
			scalars: [
				{
					labels: {
						service: "api",
						environment: "production",
					},
					value: 100,
				},
				// {
				// 	labels: {
				// 		service: "api",
				// 		environment: "staging",
				// 	},
				// 	value: 200,
				// },
			],
		}));
	},
};

export { MetricsAPI, Metrics };
