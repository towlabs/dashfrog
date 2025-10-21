import { NewRestAPI } from "@/src/services/api/_helper";
import type {
	Metric,
	MetricKind,
	MetricScope,
	MetricsStore,
	MetricUnits,
} from "@/src/types/metric";

const MetricsAPI = NewRestAPI(`api`);

/**
 * Backend metric kinds (before conversion)
 */
type BackendMetricKind = "counter" | "gauge" | "stats" | "other" | string;

/**
 * Raw metric response from backend API (snake_case)
 * This is internal to the API service and converted to Metric (camelCase)
 */
interface MetricApiResponse {
	id: number;
	key: string;
	kind: BackendMetricKind;
	scope: MetricScope;
	unit: MetricUnits;
	display_as: string;
	description: string;
	associated_identifiers: string[];
	labels: number[];
}

type MetricsApiResponse = MetricApiResponse[];

/**
 * Convert backend kind to frontend MetricKind
 */
function convertKind(backendKind: BackendMetricKind): MetricKind {
	if (backendKind === "other" || backendKind === "stats") {
		return "distribution";
	}
	if (backendKind === "counter") {
		return "events";
	}
	if (backendKind === "gauge") {
		return "values";
	}
	// Default fallback
	return "values";
}

/**
 * Convert backend API response to frontend Metric type
 * Transforms snake_case to camelCase
 */
function toMetric(apiMetric: MetricApiResponse): Metric {
	return {
		id: apiMetric.id,
		key: apiMetric.key,
		kind: convertKind(apiMetric.kind),
		scope: apiMetric.scope,
		unit: apiMetric.unit,
		displayAs: apiMetric.display_as,
		description: apiMetric.description,
		prometheusName: apiMetric.key,
		prometheusMetricName:
			apiMetric.associated_identifiers?.[0] || apiMetric.key,
		// Labels will be converted to label names in MetricQueryBuilder
		labels: apiMetric.labels.map(String),
	};
}

/**
 * Process metrics from API into indexed store
 * Converts API response format to JavaScript conventions
 */
function processMetrics(apiMetrics: MetricApiResponse[]): MetricsStore {
	const store: MetricsStore = {};

	apiMetrics.forEach((apiMetric) => {
		const metric = toMetric(apiMetric);
		store[metric.id] = metric;
	});

	return store;
}

const Metrics = {
	getAll: () => {
		return MetricsAPI.get<MetricsApiResponse>("metrics", {
			meta: { action: "fetch", resource: "metrics" },
		});
	},
};

export { MetricsAPI, Metrics, processMetrics };
