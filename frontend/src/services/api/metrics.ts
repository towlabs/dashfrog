import {NewRestAPI} from "@/src/services/api/_helper";

const MetricsAPI = NewRestAPI(`api`);

export type Kind = 'counter' | 'gauge' | 'histogram' | 'summary' | 'untyped';

export interface Metric {
  id: number;
  key: string;
  kind: Kind;
  scope: string;
  unit: string;
  display_as: string;
  description: string;
  associated_identifiers: string[];
}

export type MetricsResponse = Metric[];

/**
 * Processed metrics structure for easy lookup
 * Maps metric IDs to their display values
 */
export interface ProcessedMetric {
  id: number;
  key: string;
  kind: Kind;
  scope: string;
  unit: string;
  displayAs: string;
  description: string;
  associatedIdentifiers: string[];
}

export interface MetricsStore {
  [metricId: number]: ProcessedMetric;
}

/**
 * Process raw metrics from API into a more usable format
 * Creates an indexed store by metric ID for fast lookups
 */
export function processMetrics(metrics: Metric[]): MetricsStore {
  const store: MetricsStore = {};

  metrics.forEach(metric => {
    store[metric.id] = {
      id: metric.id,
      key: metric.key,
      kind: metric.kind,
      scope: metric.scope,
      unit: metric.unit,
      displayAs: metric.display_as,
      description: metric.description,
      associatedIdentifiers: metric.associated_identifiers
    };
  });

  return store;
}

const Metrics = {
  getAll: () => {
    return MetricsAPI.get<MetricsResponse>('metrics');
  }
};

export { MetricsAPI, Metrics };
