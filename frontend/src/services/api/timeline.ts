import { NewRestAPI } from "@/src/services/api/_helper";
import type { ApiFilter, Filter } from "@/src/types/filter";
import type { TimelineEvent } from "@/src/types/timeline";

const TimelineAPI = NewRestAPI(`api`);

/**
 * Raw timeline event response from backend API (snake_case)
 * This is internal to the API service and converted to TimelineEvent (camelCase)
 */
interface TimelineEventApiResponse {
	name: string;
	emoji: string;
	markdown: string;
	event_dt: string; // ISO date string from backend
	labels: Record<string, string>;
}

type TimelineApiResponse = TimelineEventApiResponse[];

/**
 * Convert backend API response to frontend TimelineEvent type
 * Transforms snake_case to camelCase and converts date string to Date object
 */
function toTimelineEvent(apiEvent: TimelineEventApiResponse): TimelineEvent {
	return {
		name: apiEvent.name,
		emoji: apiEvent.emoji,
		markdown: apiEvent.markdown,
		eventDt: new Date(apiEvent.event_dt),
		labels: apiEvent.labels,
	};
}

/**
 * Process timeline events from API
 * Converts API response format to JavaScript conventions
 */
function processTimelineEvents(
	apiEvents: TimelineEventApiResponse[],
): TimelineEvent[] {
	return apiEvents.map((apiEvent) => toTimelineEvent(apiEvent));
}

/**
 * Convert Filter to ApiFilter format for backend
 */
function toApiFilter(filter: Filter): ApiFilter {
	return {
		key: filter.label,
		operator: filter.operator,
		value: filter.value,
		is_label: true,
	};
}

const Timeline = {
	/**
	 * Get timeline events for a specific tenant with optional time range and filters
	 */
	getByTenant: async (
		tenant: string,
		start: Date,
		end: Date,
		filters?: Filter[],
	) => {
		// TODO: Remove dummy data when backend is ready
		// Simulate network delay for testing loading states
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Generate dummy timeline events
		const now = new Date();
		const dummyData: TimelineApiResponse = [
			{
				name: "User Registration Completed",
				emoji: "👤",
				markdown: "New user **john.doe@example.com** registered successfully",
				event_dt: new Date(now.getTime() - 5 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "api",
					user_id: "usr_123abc",
				},
			},
			{
				name: "Payment Processed",
				emoji: "💳",
				markdown: "Payment of **$99.99** processed for order #12345",
				event_dt: new Date(now.getTime() - 15 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "payment",
					amount: "99.99",
					currency: "USD",
				},
			},
			{
				name: "Email Sent",
				emoji: "📧",
				markdown: "Welcome email sent to **john.doe@example.com**",
				event_dt: new Date(now.getTime() - 20 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "notification",
					template: "welcome",
				},
			},
			{
				name: "API Request Failed",
				emoji: "❌",
				markdown: "API request to /api/users failed with 500",
				event_dt: new Date(now.getTime() - 30 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "api",
					status_code: "500",
				},
			},
			{
				name: "Cache Cleared",
				emoji: "🗑️",
				markdown: "Redis cache cleared for user sessions",
				event_dt: new Date(now.getTime() - 45 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "cache",
				},
			},
			{
				name: "Database Migration",
				emoji: "🗄️",
				markdown: "Migration **v1.2.3** completed successfully",
				event_dt: new Date(now.getTime() - 60 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "database",
					version: "1.2.3",
				},
			},
			{
				name: "Backup Completed",
				emoji: "💾",
				markdown: "Database backup completed (2.3 GB)",
				event_dt: new Date(now.getTime() - 75 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "database",
					size: "2.3GB",
				},
			},
			{
				name: "Deployment Started",
				emoji: "🚀",
				markdown: "Deployment of **api-service v2.1.0** started",
				event_dt: new Date(now.getTime() - 90 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "api",
					version: "2.1.0",
				},
			},
			{
				name: "Security Alert",
				emoji: "🔒",
				markdown: "Multiple failed login attempts detected",
				event_dt: new Date(now.getTime() - 105 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "auth",
					severity: "high",
				},
			},
			{
				name: "Error Detected",
				emoji: "⚠️",
				markdown: "Rate limit exceeded for API key **sk_live_***",
				event_dt: new Date(now.getTime() - 120 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "api",
					severity: "warning",
				},
			},
			{
				name: "Server Restarted",
				emoji: "🔄",
				markdown: "Worker server restarted after memory threshold",
				event_dt: new Date(now.getTime() - 135 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "worker",
				},
			},
			{
				name: "SSL Certificate Renewed",
				emoji: "🔐",
				markdown: "SSL certificate renewed for *.example.com",
				event_dt: new Date(now.getTime() - 150 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "infrastructure",
				},
			},
			{
				name: "API Key Created",
				emoji: "🔑",
				markdown: "New API key created for integration",
				event_dt: new Date(now.getTime() - 165 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "api",
				},
			},
			{
				name: "Webhook Delivered",
				emoji: "📡",
				markdown: "Webhook delivered to https://example.com/webhook",
				event_dt: new Date(now.getTime() - 180 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "webhook",
					status: "200",
				},
			},
			{
				name: "Scaling Event",
				emoji: "📈",
				markdown: "Auto-scaled to 5 instances due to high load",
				event_dt: new Date(now.getTime() - 195 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "infrastructure",
					instances: "5",
				},
			},
			{
				name: "Log Archive Created",
				emoji: "📦",
				markdown: "Weekly log archive created (15.2 GB)",
				event_dt: new Date(now.getTime() - 210 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "logging",
					size: "15.2GB",
				},
			},
			{
				name: "Feature Flag Updated",
				emoji: "🚩",
				markdown: "Feature flag **new-checkout** enabled for 50% of users",
				event_dt: new Date(now.getTime() - 225 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "feature-flags",
					rollout: "50%",
				},
			},
			{
				name: "Health Check Failed",
				emoji: "💔",
				markdown: "Health check failed for worker-3",
				event_dt: new Date(now.getTime() - 240 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "worker",
					instance: "worker-3",
				},
			},
			{
				name: "Monitoring Alert Resolved",
				emoji: "✅",
				markdown: "CPU usage alert resolved",
				event_dt: new Date(now.getTime() - 255 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "monitoring",
				},
			},
			{
				name: "Data Export Completed",
				emoji: "📤",
				markdown: "Customer data export completed",
				event_dt: new Date(now.getTime() - 270 * 60000).toISOString(),
				labels: {
					tenant,
					environment: "production",
					service: "api",
					format: "csv",
				},
			},
		];

		return Promise.resolve({ data: dummyData });

		/* Uncomment when backend is ready
		const params: Record<string, string> = {};

		// Add time range if provided
		if (start && end) {
			params.from = start.toISOString();
			params.to = end.toISOString();
		}

		// Convert filters to API format if provided
		const apiFilters = filters ? filters.map(toApiFilter) : undefined;

		// Use POST if we have filters, otherwise GET
		if (apiFilters && apiFilters.length > 0) {
			return TimelineAPI.post<TimelineApiResponse>(
				`timeline/${encodeURIComponent(tenant)}/search`,
				{
					data: { filters: apiFilters, ...params },
					meta: { action: "search", resource: "timeline" },
				},
			);
		}

		return TimelineAPI.get<TimelineApiResponse>(
			`timeline/${encodeURIComponent(tenant)}`,
			{
				params,
				meta: { action: "fetch", resource: "timeline" },
			},
		);
		*/
	},
};

export { TimelineAPI, Timeline, processTimelineEvents, toTimelineEvent };
