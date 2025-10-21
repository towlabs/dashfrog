import * as React from "react";
import { AggregationSettings } from "@/components/blocks/ChartSettingsItem";
import { MetricQueryBuilder } from "@/components/MetricQueryBuilder";
import { MultiSelect } from "@/components/ui/multi-select";
import type { Filter } from "@/src/types/filter";
import type { Aggregation, Metric, MetricKind } from "@/src/types/metric";
import { allowedAggregationsByKind } from "@/src/types/metric";

const defaultAggregation = {
	values: "avg",
	distribution: "p95",
	events: "sum",
} as const;

interface MetricConfigurationProps {
	/** Currently selected metric */
	selectedMetric: Metric<MetricKind> | null;
	/** Callback when metric changes */
	onMetricChange: (metric: Metric<MetricKind> | null) => void;
	/** Current filters */
	filters: Filter[];
	/** Callback when filters change */
	onFiltersChange: (filters: Filter[]) => void;
	/** Current aggregation */
	aggregation: Aggregation | "";
	/** Callback when aggregation changes */
	onAggregationChange: (aggregation: Aggregation) => void;
	/** Current groupBy labels */
	groupBy: string[];
	/** Callback when groupBy changes */
	onGroupByChange: (labels: string[]) => void;
	/** Whether to show groupBy selector */
	showGroupBy?: boolean;
	/** Whether to show aggregation for distributions only, or also when grouped */
	showAggregationWhen?: "distribution" | "distribution-or-grouped";
}

export function MetricConfiguration({
	selectedMetric,
	onMetricChange,
	filters,
	onFiltersChange,
	aggregation,
	onAggregationChange,
	groupBy,
	onGroupByChange,
	showGroupBy = true,
	showAggregationWhen = "distribution-or-grouped",
}: MetricConfigurationProps) {
	// Get available labels from the selected metric
	const availableLabels = React.useMemo(() => {
		if (!selectedMetric) return [];
		return Array.isArray(selectedMetric.labels)
			? selectedMetric.labels.filter((label) => typeof label === "string")
			: [];
	}, [selectedMetric]);

	// Auto-correct aggregation when it's invalid for the current metric kind
	React.useEffect(() => {
		if (selectedMetric) {
			const allowedAggregations =
				allowedAggregationsByKind[selectedMetric.kind];
			const isValid = allowedAggregations.includes(aggregation as Aggregation);

			if (!isValid) {
				// Aggregation is invalid for this metric kind, set to default
				const defaultValue = defaultAggregation[selectedMetric.kind];
				onAggregationChange(defaultValue);
			}
		}
	}, [selectedMetric, aggregation, onAggregationChange]);

	// Determine if aggregation settings should be shown
	const showAggregation = React.useMemo(() => {
		if (!selectedMetric) return false;

		if (showAggregationWhen === "distribution") {
			return selectedMetric.kind === "distribution";
		}

		// "distribution-or-grouped"
		return (
			selectedMetric.kind === "distribution" ||
			(groupBy.length > 0 && selectedMetric.kind !== "distribution")
		);
	}, [selectedMetric, groupBy, showAggregationWhen]);

	return (
		<div className="space-y-3">
			{/* Metric Selection */}
			<MetricQueryBuilder
				selectedMetric={selectedMetric}
				onMetricChange={onMetricChange}
				filters={filters}
				onFiltersChange={onFiltersChange}
			/>

			{/* Aggregation for distributions */}
			{selectedMetric && selectedMetric.kind === "distribution" && (
				<AggregationSettings
					value={aggregation}
					onChange={onAggregationChange}
					metric={selectedMetric}
				/>
			)}

			{/* Group By */}
			{showGroupBy && selectedMetric && (
				<div className="space-y-2">
					<label className="text-xs text-muted-foreground font-medium">
						Group time series by
					</label>
					<MultiSelect
						options={availableLabels.map((label) => ({
							value: label as string,
							label: label as string,
						}))}
						disabled={!selectedMetric}
						value={groupBy}
						onChange={onGroupByChange}
						placeholder="Select labels to group by..."
						searchPlaceholder="Search labels..."
					/>
				</div>
			)}

			{/* Aggregation for grouped non-distribution metrics */}
			{showAggregation &&
				selectedMetric &&
				groupBy.length > 0 &&
				selectedMetric.kind !== "distribution" && (
					<AggregationSettings
						value={aggregation}
						onChange={onAggregationChange}
						metric={selectedMetric}
					/>
				)}
		</div>
	);
}
