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
	series: {
		labels: Record<string, string>;
		data: MetricHistoryPoint[];
	}[];
};

/**
 * Generate mock metric history data
 */
function generateMockHistory(
	metricName: string,
	unit: string | null,
	startTime: Date,
	endTime: Date,
	factor: number = 1,
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
		const value = baseValue * (1 + variation) * factor;

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
		const dummyData: Metric[] = [
			{
				name: "HTTP Requests",
				prometheusName: "http_requests",
				unit: "requests",
				aggregation: "ratePerSecond",
				labels: ["service", "environment"],
			},
			{
				name: "Errors",
				prometheusName: "error_rate",
				unit: "",
				aggregation: "increase",
				labels: ["service", "environment"],
			},
			{
				name: "CPU Usage",
				prometheusName: "cpu_usage_percent",
				unit: "percent",
				aggregation: "increase",
				labels: ["service", "instance"],
			},
			{
				name: "Memory Usage",
				prometheusName: "memory_usage_bytes",
				unit: "bytes",
				aggregation: "increase",
				labels: ["service", "instance"],
			},
			{
				name: "Response Time",
				prometheusName: "http_request_duration_seconds",
				unit: "seconds",
				aggregation: "p95",
				labels: ["method", "endpoint"],
			},
			{
				name: "Events",
				prometheusName: "events_rate",
				unit: "events",
				aggregation: "ratePerMinute",
				labels: ["service", "type"],
			},
			{
				name: "Requests",
				prometheusName: "http_requests_total",
				unit: "count",
				aggregation: "increase",
				labels: ["method", "status"],
			},
			{
				name: "Active Users",
				prometheusName: "active_users_daily",
				unit: "users",
				aggregation: "ratePerDay",
				labels: ["platform"],
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
		_filters?: Filter[],
	): Promise<MetricHistoryResponse> => {
		// TODO: Remove dummy data when backend is ready
		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		return {
			series: [
				{
					labels: {
						service: "api",
						environment: "production",
					},
					data: generateMockHistory(metricName, unit, startTime, endTime, 1),
				},
				{
					labels: {
						service: "api",
						environment: "staging",
					},
					data: generateMockHistory(metricName, unit, startTime, endTime, 2),
				},
			],
		};

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

export { MetricsAPI, Metrics };
