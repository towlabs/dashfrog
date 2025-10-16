import {NewRestAPI} from "@/src/services/api/_helper";

const LabelsAPI = NewRestAPI(`api`);

export interface LabelValue {
  value: string;
  mapped_to: string | null;
}

export interface LabelUsage {
  used_in: string;
  kind: string; // LabelSrcKind from backend
}

export interface Label {
  id: number;
  label: string;
  description: string | null;
  values: LabelValue[];
  used_in: LabelUsage[];
}

export type LabelsResponse = Label[];

/**
 * Processed label structure for easy lookup
 * Maps label names to their values and mappings
 */
export interface ProcessedLabel {
  id: number;
  name: string;
  description: string | null;
  values: string[]; // ONLY actual queryable values (NOT proxied/mapped_to values)
  valueMappings: Map<string, string>; // Maps actual value -> display alias (mapped_to)
  usedIn: LabelUsage[];
}

export interface LabelsStore {
  [labelName: string]: ProcessedLabel;
}

/**
 * Process raw labels from API into a more usable format
 *
 * IMPORTANT: Only actual label values are included in the values array.
 * Proxied/mapped values (mapped_to) are NOT included as they are display aliases only
 * and won't be returned from backend queries.
 */
export function processLabels(labels: Label[]): LabelsStore {
  const store: LabelsStore = {};

  labels.forEach(label => {
    const valueMappings = new Map<string, string>();
    const actualValues: string[] = [];

    // Process values and their mappings
    label.values.forEach(val => {
      // Only include actual values that can be used in queries
      actualValues.push(val.value);

      // Store mapping for display purposes only
      if (val.mapped_to) {
        valueMappings.set(val.value, val.mapped_to);
      }
    });

    store[label.label] = {
      id: label.id,
      name: label.label,
      description: label.description,
      values: actualValues.sort(), // Only actual queryable values
      valueMappings, // Maps actual values to display aliases
      usedIn: label.used_in
    };
  });

  return store;
}

const Labels = {
  getAll: () => {
    return LabelsAPI.get<LabelsResponse>('labels');
  },

  updateDescription: (labelId: number, description: string) => {
    return LabelsAPI.put<Label>(`labels/${labelId}`, {
      data: { description }
    });
  },

  updateValueProxy: (labelId: number, valueName: string, proxy: string | null) => {
    return LabelsAPI.put<LabelValue>(`labels/${labelId}/value/${valueName}`, {
      data: { proxy }
    });
  }
};

export { LabelsAPI, Labels };
