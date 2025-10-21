/**
 * Label Types
 *
 * This file contains all type definitions related to labels.
 * Labels are key-value metadata that can be attached to workflows and metrics.
 *
 * All types follow JavaScript naming conventions (camelCase).
 * API response conversion happens in the API service layer.
 */

/**
 * Represents where and how a label is being used
 */
export interface LabelUsage {
	/** Identifier of the entity using this label (e.g., metric ID, workflow name) */
	usedIn: string;
	/** Type of entity using the label (e.g., "metric", "metrics", "flow", "workflow") */
	kind: string;
}

/**
 * Label data structure (JavaScript conventions)
 *
 * This is the canonical label type used throughout the application.
 * API services convert backend responses to this format.
 */
export interface Label {
	/** Unique identifier for the label */
	id: number;
	/** Name of the label (internal key) */
	name: string;
	/** Display name shown to users (null means use name) */
	displayAs: string | null;
	/** Optional description explaining what this label represents */
	description: string | null;
	/** Whether this label is hidden from normal display */
	hide: boolean;
	/**
	 * ONLY actual queryable values (NOT proxied/mapped_to values)
	 * These are the values that can be used in API queries
	 */
	values: string[];
	/**
	 * Maps actual value -> display alias
	 * Used for displaying user-friendly names in the UI
	 */
	valueMappings: Map<string, string>;
	/** List of entities that use this label */
	usedIn: LabelUsage[];
}

/**
 * Store structure for efficient label lookups
 * Maps label names to their data
 */
export interface LabelsStore {
	[labelName: string]: Label;
}
