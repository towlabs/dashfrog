import { NewRestAPI } from "@/src/services/api/_helper";
import type { Label } from "@/src/types/label";

const LabelsAPI = NewRestAPI(`api`);

/**
 * Raw label response from backend API (snake_case)
 * This is internal to the API service and converted to Label (camelCase)
 */
interface LabelApiResponse {
	name: string;
	values: string[];
}

type LabelsApiResponse = LabelApiResponse[];

/**
 * Convert backend API response to frontend Label type
 * In this case, the structure is the same, but this maintains consistency
 * with our API service pattern
 */
function toLabel(apiLabel: LabelApiResponse): Label {
	return {
		name: apiLabel.name,
		values: apiLabel.values,
	};
}

/**
 * Process labels from API
 * Converts API response format to JavaScript conventions
 */
function processLabels(apiLabels: LabelApiResponse[]): Label[] {
	return apiLabels.map((apiLabel) => toLabel(apiLabel));
}

const Labels = {
	/**
	 * Get all labels
	 */
	getAll: async () => {
		// TODO: Remove dummy data when backend is ready
		// Simulate network delay for testing loading states
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Return dummy data
		// TIP: To test empty state, change dummyData to []
		const dummyData: LabelsApiResponse = [
			{
				name: "tenant",
				values: ["acme-corp", "globex-corporation", "stark-industries"],
			},
			{
				name: "environment",
				values: ["production", "staging", "development"],
			},
			{ name: "service", values: ["api", "web", "worker", "database"] },
			{ name: "region", values: ["us-east-1", "us-west-2", "eu-west-1"] },
		];

		return Promise.resolve({ data: dummyData } as any);

		/* Uncomment when backend is ready
		return LabelsAPI.get<LabelsApiResponse>("labels", {
			meta: { action: "fetch", resource: "labels" },
		});
		*/
	},
};

export { LabelsAPI, Labels, processLabels, toLabel };
