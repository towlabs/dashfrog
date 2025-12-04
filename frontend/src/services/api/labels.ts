import { flatMap, groupBy, uniq } from "lodash";
import { fetchWithAuth } from "@/src/lib/fetch-wrapper";
import type { Label } from "@/src/types/label";

const Labels = {
	getFlowLabels: async () => {
		const response = await fetchWithAuth(`/api/flows/labels`);
		const data = (await response.json()) as Label[];
		return data;
	},

	getFlowTenants: async () => {
		const response = await fetchWithAuth(`/api/flows/tenants`);
		const data = (await response.json()) as string[];
		return data;
	},

	getMetricsLabels: async () => {
		const response = await fetchWithAuth(`/api/metrics/labels`);
		const data = (await response.json()) as Label[];
		return data;
	},

	getAll: async (): Promise<{ labels: Label[]; tenants: string[] }> => {
		// Fetch both in parallel for better performance
		const [flowLabels, flowTenants, allMetricsLabels] = await Promise.all([
			Labels.getFlowLabels(),
			Labels.getFlowTenants(),
			Labels.getMetricsLabels(),
		]);

		const metricsTenants = allMetricsLabels
			.filter((label) => label.label === "tenant")
			.flatMap((label) => label.values);
		const metricsLabels = allMetricsLabels.filter(
			(label) => label.label !== "tenant",
		);

		const groupedLabels = groupBy(
			[...flowLabels, ...metricsLabels],
			(label) => label.label,
		);
		const tenants = uniq([...flowTenants, ...metricsTenants]);

		return {
			labels: Object.entries(groupedLabels)
				.map(([label, values]) => ({
					label,
					values: uniq(flatMap(values, (label) => label.values)),
				}))
				.sort((a, b) => a.label.localeCompare(b.label)),
			tenants: tenants.sort(),
		};
	},
};

export { Labels };
