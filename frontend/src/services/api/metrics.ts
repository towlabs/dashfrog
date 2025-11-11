import { NewRestAPI } from "@/src/services/api/_helper";
import type { Filter } from "@/src/types/filter";
import type {
	Metric,
	MetricAggregation,
	MetricValue,
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
	data: MetricHistoryPoint[];
};

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
		unit: apiMetric.unit,
		values: apiMetric.values.map(toMetricValue),
		aggregation: apiMetric.aggregation,
	};
}

/**
 * Generate mock metric history data
 */
function generateMockHistory(
	metricName: string,
	unit: string | null,
	startTime: Date,
	endTime: Date,
): MetricHistoryPoint[] {
	const points: MetricHistoryPoint[] = [];
	const duration = endTime.getTime() - startTime.getTime();
	const numPoints = 50; // Generate 50 data points
	const interval = duration / numPoints;

	// Base value varies by unit type (raw values as backend would return)
	let baseValue = 100;

	if (unit === "percent" || unit === "%") {
		baseValue = 0.45; // 0-1 range (45%)
	} else if (unit === "bytes") {
		baseValue = 524288000; // ~500 MB in bytes
	} else if (unit === "seconds" || unit === "s") {
		baseValue = 0.234; // ~234ms
	} else if (metricName.toLowerCase().includes("rate")) {
		baseValue = 150; // requests/s
	} else if (unit === "count") {
		baseValue = 15000;
	}

	for (let i = 0; i < numPoints; i++) {
		const timestamp = new Date(startTime.getTime() + i * interval);
		// Add some realistic variation
		const variation = (Math.sin(i / 5) + Math.random() * 0.4 - 0.2) * 0.1;
		const value = baseValue * (1 + variation);

		points.push({
			timestamp,
			value: Math.max(0, value), // Ensure non-negative
		});
	}

	return points;
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
				name: "HTTP Requests",
				prometheusName: "http_requests",
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
				name: "Errors",
				prometheusName: "error_rate",
				description: "Error percentage (0-1 range)",
				unit: "percent",
				aggregation: "increase",
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
				aggregation: "increase",
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
				aggregation: "increase",
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
				aggregation: "p95",
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
				name: "Events",
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
				name: "Requests",
				prometheusName: "http_requests_total",
				description: "Total number of HTTP requests",
				unit: "count",
				aggregation: "increase",
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
				name: "Active Users",
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

	/**
	 * Get metric history for a specific metric with labels
	 */
	getHistory: async (
		_tenant: string,
		metricName: string,
		unit: string | null,
		startTime: Date,
		endTime: Date,
		_labels: Record<string, string>,
		_filters?: Filter[],
	): Promise<MetricHistoryResponse> => {
		// TODO: Remove dummy data when backend is ready
		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		const data = generateMockHistory(metricName, unit, startTime, endTime);

		return { data };

		/* Uncomment when backend is ready
		const params: Record<string, string> = {};

		// Add time range
		params.from = startTime.toISOString();
		params.to = endTime.toISOString();

		// Add labels
		params.labels = JSON.stringify(labels);

		// Add filters if provided
		if (filters && filters.length > 0) {
			params.filters = JSON.stringify(filters);
		}

		return MetricsAPI.get<MetricHistoryPoint[]>(
			`metrics/${encodeURIComponent(tenant)}/${encodeURIComponent(metricName)}/history`,
			{
				params,
				meta: { action: "fetch", resource: "metric-history" },
			},
		).then(response => ({ data: response.data.map(point => ({
			...point,
			timestamp: new Date(point.timestamp)
		})) }));
		*/
	},
};

export { MetricsAPI, Metrics, toMetric, toMetricValue };
