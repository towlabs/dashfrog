import * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
	Aggregation,
	AggregationForKind,
	Metric,
	MetricKind,
} from "@/src/types/metric";
import { allowedAggregationsByKind } from "@/src/types/metric";

// Re-export for backward compatibility
export type { Aggregation };

export type AggregationSettingsProps<KindT extends MetricKind = MetricKind> = {
	metric: Metric<KindT> | null;
	value: AggregationForKind<KindT> | "";
	onChange: (value: AggregationForKind<KindT>) => void;
	variant?: "default" | "outline";
};

function getAggregationLabel(agg: Aggregation): string {
	const labels: Record<Aggregation, string> = {
		avg: "Average",
		min: "Min",
		max: "Max",
		sum: "Sum",
		p50: "P50 (Median)",
		p90: "P90",
		p95: "P95",
		p99: "P99",
	};
	return labels[agg];
}

export function AggregationSettings<KindT extends MetricKind>({
	metric,
	value,
	onChange,
	variant = "outline",
}: AggregationSettingsProps<KindT>) {
	const options: Aggregation[] = React.useMemo(() => {
		return metric ? allowedAggregationsByKind[metric.kind] : [];
	}, [metric]);

	return (
		<div className="space-y-2">
			<label className="text-xs text-muted-foreground font-medium">
				Aggregation
			</label>
			<Select
				value={value}
				onValueChange={(val) => onChange(val as AggregationForKind<KindT>)}
				disabled={options.length === 0}
			>
				<SelectTrigger
					className={cn(
						"h-9",
						variant === "outline" &&
							"bg-transparent border border-input hover:bg-accent/50 focus:ring-2 focus:ring-ring focus:ring-offset-2",
					)}
				>
					<SelectValue placeholder="Choose aggregation..." />
				</SelectTrigger>
				<SelectContent>
					{options.map((agg) => (
						<SelectItem key={agg} value={agg}>
							{getAggregationLabel(agg)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

import {
	type DragHandleMenuProps,
	useBlockNoteEditor,
	useComponentsContext,
} from "@blocknote/react";

export function ChartSettingsItem(props: DragHandleMenuProps) {
	const Components = useComponentsContext()!;
	const editor = useBlockNoteEditor();

	if ((props.block.type as string) !== "chart") return null;

	return (
		<Components.Generic.Menu.Item
			onClick={() =>
				editor.updateBlock(props.block, {
					props: { ...(props.block.props || {}), open: true },
				})
			}
		>
			<div className="flex items-center gap-2">
				<span>Settings</span>
			</div>
		</Components.Generic.Menu.Item>
	);
}
