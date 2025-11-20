import { flatMap, groupBy, uniq } from "lodash";
import type { Label } from "@/src/types/label";

const Labels = {
	getFlowLabels: async () => {
		const response = await fetch(`/api/flows/labels`);
		const data = (await response.json()) as Label[];
		return data;
	},

	getFlowTenants: async () => {
		const response = await fetch(`/api/flows/tenants`);
		const data = (await response.json()) as string[];
		return data;
	},

	getTimelineLabels: async () => {
		const response = await fetch(`/api/timeline/labels`);
		const data = (await response.json()) as Label[];
		return data;
	},

	getTimelineTenants: async () => {
		const response = await fetch(`/api/timeline/tenants`);
		const data = (await response.json()) as string[];
		return data;
	},

	getMetricsLabels: async () => {
		const response = await fetch(`/api/metrics/labels`);
		const data = (await response.json()) as Label[];
		return data;
	},

	getAll: async (): Promise<{ labels: Label[]; tenants: string[] }> => {
		// Fetch both in parallel for better performance
		const [
			flowLabels,
			timelineLabels,
			flowTenants,
			timelineTenants,
			allMetricsLabels,
		] = await Promise.all([
			Labels.getFlowLabels(),
			Labels.getTimelineLabels(),
			Labels.getFlowTenants(),
			Labels.getTimelineTenants(),
			Labels.getMetricsLabels(),
		]);

		const metricsTenants = allMetricsLabels
			.filter((label) => label.label === "tenant")
			.flatMap((label) => label.values);
		const metricsLabels = allMetricsLabels.filter(
			(label) => label.label !== "tenant",
		);

		const groupedLabels = groupBy(
			[...flowLabels, ...timelineLabels, ...metricsLabels],
			(label) => label.label,
		);
		const tenants = uniq([
			...flowTenants,
			...timelineTenants,
			...metricsTenants,
		]);

		return {
			labels: Object.entries(groupedLabels).map(([label, values]) => ({
				label,
				values: uniq(flatMap(values, (label) => label.values)),
			})),
			tenants,
		};
	},
};

export { Labels };
