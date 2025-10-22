import { NewRestAPI } from "@/src/services/api/_helper";
import type {
	Metric,
	MetricKind,
	MetricScope,
	MetricUnits,
	MetricsStore,
} from "@/src/types/metric";

const MetricsAPI = NewRestAPI(`api`);

/**
 * Raw metric response from backend API (snake_case)
 * This is internal to the API service and converted to Metric (camelCase)
 */
interface MetricApiResponse {
	id: number;
	key: string;
	kind: MetricKind;
	scope: MetricScope;
	unit: MetricUnits;
	display_as: string;
	description: string;
	associated_identifiers: string[];
	labels: number[];
}

type MetricsApiResponse = MetricApiResponse[];

/**
 * Convert backend API response to frontend Metric type
 * Transforms snake_case to camelCase
 */
function toMetric(apiMetric: MetricApiResponse): Metric {
	return {
		id: apiMetric.id,
		key: apiMetric.key,
		kind: apiMetric.kind,
		scope: apiMetric.scope,
		unit: apiMetric.unit,
		displayAs: apiMetric.display_as,
		description: apiMetric.description,
		associatedIdentifiers: apiMetric.associated_identifiers,
		labels: apiMetric.labels,
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
