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
	getAll: () => {
		return LabelsAPI.get<LabelsApiResponse>("labels", {
			meta: { action: "fetch", resource: "labels" },
		});
	},
};

export { LabelsAPI, Labels, processLabels, toLabel };
