import { NewRestAPI } from "@/src/services/api/_helper";
import type { Label, LabelsStore } from "@/src/types/label";

const LabelsAPI = NewRestAPI(`api`);

/**
 * Raw label value from backend API (snake_case)
 */
interface LabelValueApiResponse {
	value: string;
	mapped_to: string | null;
}

/**
 * Raw label usage from backend API (snake_case)
 */
interface LabelUsageApiResponse {
	used_in: string | number;
	kind: string;
}

/**
 * Raw label response from backend API (snake_case)
 * This is internal to the API service and converted to Label (camelCase)
 */
interface LabelApiResponse {
	id: number;
	label: string;
	display_as: string | null;
	description: string | null;
	hide: boolean;
	values: LabelValueApiResponse[];
	used_in: LabelUsageApiResponse[];
}

type LabelsApiResponse = LabelApiResponse[];

/**
 * Convert backend API response to frontend Label type
 * Transforms snake_case to camelCase and processes value mappings
 */
function toLabel(apiLabel: LabelApiResponse): Label {
	const valueMappings = new Map<string, string>();
	const actualValues: string[] = [];

	// Process values and their mappings
	apiLabel.values.forEach((val) => {
		// Only include actual values that can be used in queries
		actualValues.push(val.value);

		// Store mapping for display purposes only
		if (val.mapped_to) {
			valueMappings.set(val.value, val.mapped_to);
		}
	});

	return {
		id: apiLabel.id,
		name: apiLabel.label,
		displayAs: apiLabel.display_as,
		description: apiLabel.description,
		hide: apiLabel.hide,
		values: actualValues.sort(),
		valueMappings,
		usedIn: apiLabel.used_in.map((usage) => ({
			usedIn: String(usage.used_in),
			kind: usage.kind,
		})),
	};
}

/**
 * Process labels from API into indexed store
 * Converts API response format to JavaScript conventions
 */
function processLabels(apiLabels: LabelApiResponse[]): LabelsStore {
	const store: LabelsStore = {};

	apiLabels.forEach((apiLabel) => {
		const label = toLabel(apiLabel);
		store[label.name] = label;
	});

	return store;
}

const Labels = {
	getAll: (withHidden = false) => {
		const params = new URLSearchParams();
		if (withHidden) {
			params.append("with_hidden", "true");
		}
		const queryString = params.toString();
		const path = queryString ? `labels?${queryString}` : "labels";
		return LabelsAPI.get<LabelsApiResponse>(path);
	},

	updateDescription: (labelId: number, description: string) => {
		return LabelsAPI.put<LabelApiResponse>(`labels/${labelId}`, {
			data: { description },
		});
	},

	updateDisplayAs: (labelId: number, displayAs: string) => {
		return LabelsAPI.put<LabelApiResponse>(`labels/${labelId}`, {
			data: { display_as: displayAs },
		});
	},

	updateHide: (labelId: number, hide: boolean) => {
		return LabelsAPI.put<LabelApiResponse>(`labels/${labelId}`, {
			data: { hide },
		});
	},

	updateValueProxy: (
		labelId: number,
		valueName: string,
		proxy: string | null,
	) => {
		return LabelsAPI.put<LabelValueApiResponse>(
			`labels/${labelId}/value/${valueName}`,
			{
				data: { proxy },
			},
		);
	},
};

export { LabelsAPI, Labels, processLabels };
