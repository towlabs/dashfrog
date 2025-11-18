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

	getAllLabels: async (): Promise<Label[]> => {
		// Fetch both in parallel for better performance
		const [flowLabels, timelineLabels] = await Promise.all([
			Labels.getFlowLabels(),
			Labels.getTimelineLabels(),
		]);

		const grouped = groupBy(
			[...flowLabels, ...timelineLabels],
			(label) => label.label,
		);
		return Object.entries(grouped).map(([label, values]) => ({
			label,
			values: uniq(flatMap(values, (label) => label.values)),
		}));
	},

	getAllTenants: async (): Promise<string[]> => {
		const [flowTenants, timelineTenants] = await Promise.all([
			Labels.getFlowTenants(),
			Labels.getTimelineTenants(),
		]);
		return uniq([...flowTenants, ...timelineTenants]);
	},
};

export { Labels };
