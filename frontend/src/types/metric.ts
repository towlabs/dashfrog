/**
 * Metric Types
 *
 * This file contains all type definitions related to metrics.
 * Metrics represent measurements and data points collected from the system.
 *
 * All types follow JavaScript naming conventions (camelCase).
 * API response conversion happens in the API service layer.
 */

/**
 * Metric types (matches backend Kind enum)
 * other comes from OTEL direct metrics not managed by SDK
 */
export type MetricKind = "counter" | "measure" | "stats" | "other";

/**
 * custom is used to indicate that metrics comes for user.
 * UNKNOWN stands for metrics from unmanaged OTEL sources
 * that don't match any supported scope.
 */
export type MetricScope =
    | "api"
    | "tasks"
    | "workflow"
    | "custom"
    | "UNKNOW"
    | string;

export type MetricUnits =
    | "seconds"
    | "milliseconds"
    | "microseconds"
    | "nanoseconds"
    | "bytes"
    | "kilobytes"
    | "megabytes"
    | "gigabytes"
    | "ratio"
    | "percent"
    | "count"
    | "requests"
    | string;

/**
 * Metric data structure (JavaScript conventions)
 *
 * This is the canonical metric type used throughout the application.
 * API services convert backend responses to this format.
 */
export interface Metric {
    /** Unique identifier for the metric */
    id: number;
    /** Metric key/name as it appears in the system */
    key: string;
    /** Type of metric (counter, gauge, etc.) */
    kind: MetricKind;
    /** Scope of the metric (common: api, tasks, workflow) */
    scope: MetricScope;
    /** Unit of measurement (e.g., bytes, seconds, count) */
    unit: MetricUnits;
    /** Human-readable display name for the metric */
    displayAs: string;
    /** Description explaining what this metric measures */
    description: string;
    /** List of identifiers associated with this metric */
    associatedIdentifiers: string[];
    /** List of label IDs attached to this metric */
    labels: number[];
}

/**
 * Store structure for efficient metric lookups
 * Maps metric IDs to their data
 */
export interface MetricsStore {
    [metricId: number]: Metric;
}
