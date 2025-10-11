export type MetricType = "measure" | "counter" | "statistic"

export type Metric = {
  name: string
  label: string
  description: string
  unit?: string
  labels?: string[] // Available label keys for filtering
  metricType: MetricType // Type of metric determines available operations
}

export type Operation = {
  name: string
  label: string
  description: string
  type: "aggregation" | "filter"
  applicableTo: MetricType[] // Which metric types can use this operation
}
