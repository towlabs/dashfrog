import { NewRestAPI } from "@/src/services/api/_helper";
import type { Filter } from "@/src/types/filter";
import type {
	Metric,
	MetricAggregation,
	MetricValue,
} from "@/src/types/metric";

const MetricsAPI = NewRestAPI(`api`);

/**
 * Raw metric value response from backend API (snake_case)
 */
interface MetricValueApiResponse {
	labels: Record<string, string>;
	value: number;
}

/**
 * Raw metric response from backend API (snake_case)
 */
interface MetricApiResponse {
	name: string;
	prometheusName: string;
	description: string;
	unit: string | null;
	values: MetricValueApiResponse[];
	aggregation: MetricAggregation;
}

/**
 * Convert backend API response to frontend MetricValue type
 */
function toMetricValue(apiValue: MetricValueApiResponse): MetricValue {
	return {
		labels: apiValue.labels,
		value: apiValue.value,
	};
}

/**
 * Convert backend API response to frontend Metric type
 */
function toMetric(apiMetric: MetricApiResponse): Metric {
	return {
		name: apiMetric.name,
		prometheusName: apiMetric.prometheusName,
		description: apiMetric.description,
		unit: apiMetric.unit,
		values: apiMetric.values.map(toMetricValue),
		aggregation: apiMetric.aggregation,
	};
}

const Metrics = {
	/**
	 * Get metrics for a specific tenant with optional time range and filters
	 */
	getByTenant: async (
		_tenant: string,
		_start: Date,
		_end: Date,
		_filters?: Filter[],
	) => {
		// TODO: Remove dummy data when backend is ready
		// Simulate network delay for testing loading states
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Return dummy data
		// TIP: To test empty state, change dummyData to []
		const dummyData: MetricApiResponse[] = [
			{
				name: "Request Rate",
				prometheusName: "http_requests_rate",
				description: "HTTP requests per second",
				unit: "requests",
				aggregation: "ratePerSecond",
				values: [
					{
						labels: {
							service: "api",
							environment: "production",
						},
						value: 145.7,
					},
				],
			},
			{
				name: "Error Rate",
				prometheusName: "error_rate",
				description: "Error percentage (0-1 range)",
				unit: "percent",
				aggregation: "avg",
				values: [
					{
						labels: {
							service: "api",
							environment: "production",
						},
						value: 0.023, // 2.3%
					},
					{
						labels: {
							service: "worker",
							environment: "production",
						},
						value: 0.008, // 0.8%
					},
					{
						labels: {
							service: "database",
							environment: "production",
						},
						value: 0.001, // 0.1%
					},
				],
			},
			{
				name: "CPU Usage",
				prometheusName: "cpu_usage_percent",
				description: "CPU utilization percentage",
				unit: "percent",
				aggregation: "avg",
				values: [
					{
						labels: {
							service: "api",
							instance: "api-1",
						},
						value: 0.67, // 67%
					},
				],
			},
			{
				name: "Memory Usage",
				prometheusName: "memory_usage_bytes",
				description: "Memory usage in bytes",
				unit: "bytes",
				aggregation: "avg",
				values: [
					{
						labels: {
							service: "api",
							instance: "api-1",
						},
						value: 524288000, // ~0.49 GB
					},
					{
						labels: {
							service: "api",
							instance: "api-2",
						},
						value: 612368384, // ~0.57 GB
					},
					{
						labels: {
							service: "worker",
							instance: "worker-1",
						},
						value: 314572800, // ~0.29 GB
					},
				],
			},
			{
				name: "Response Time",
				prometheusName: "http_request_duration_seconds",
				description: "Average HTTP request duration",
				unit: "seconds",
				aggregation: "avg",
				values: [
					{
						labels: {
							method: "GET",
							endpoint: "/api/users",
						},
						value: 0.234,
					},
					{
						labels: {
							method: "POST",
							endpoint: "/api/users",
						},
						value: 0.456,
					},
				],
			},
			{
				name: "Events Per Minute",
				prometheusName: "events_rate",
				description: "Event processing rate",
				unit: "events",
				aggregation: "ratePerMinute",
				values: [
					{
						labels: {
							service: "worker",
							type: "background",
						},
						value: 8734,
					},
				],
			},
			{
				name: "Total Requests",
				prometheusName: "http_requests_total",
				description: "Total number of HTTP requests",
				unit: "count",
				aggregation: "sum",
				values: [
					{
						labels: {
							method: "GET",
							status: "200",
						},
						value: 15234,
					},
					{
						labels: {
							method: "POST",
							status: "201",
						},
						value: 3421,
					},
				],
			},
			{
				name: "Daily Active Users",
				prometheusName: "active_users_daily",
				description: "Active users per day",
				unit: "users",
				aggregation: "ratePerDay",
				values: [
					{
						labels: {
							platform: "web",
						},
						value: 12567,
					},
				],
			},
		];

		return Promise.resolve({ data: dummyData });

		/* Uncomment when backend is ready
		const params: Record<string, string> = {};

		// Add time range
		params.from = start.toISOString();
		params.to = end.toISOString();

		// Add filters if provided
		if (filters && filters.length > 0) {
			params.filters = JSON.stringify(filters);
		}

		return MetricsAPI.get<MetricApiResponse[]>(
			`metrics/${encodeURIComponent(tenant)}`,
			{
				params,
				meta: { action: "fetch", resource: "metrics" },
			},
		);
		*/
	},
};

export { MetricsAPI, Metrics, toMetric, toMetricValue };
