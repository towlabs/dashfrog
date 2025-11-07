"use client";

import { useState } from "react";
import { BarChart3, Hash, Tag } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Metric } from "@/src/types/metric";
import { MetricAggregationLabel } from "@/src/types/metric";
import { LabelBadge } from "@/components/LabelBadge";
import { formatMetricValue } from "@/src/utils/metricFormatting";
import { MetricDetailDrawer } from "@/components/MetricDetailDrawer";

type MetricsTableProps = {
	metrics: Metric[];
};

export function MetricsTable({ metrics }: MetricsTableProps) {
	const [selectedMetric, setSelectedMetric] = useState<{
		metric: Metric;
		labels: Record<string, string>;
	} | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);

	const handleRowClick = (metric: Metric, labels: Record<string, string>) => {
		setSelectedMetric({ metric, labels });
		setDrawerOpen(true);
	};

	return (
		<>
			{selectedMetric && (
				<MetricDetailDrawer
					open={drawerOpen}
					onOpenChange={setDrawerOpen}
					metric={selectedMetric.metric}
					labels={selectedMetric.labels}
				/>
			)}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<div className="flex items-center gap-2">
								<BarChart3 className="h-4 w-4" />
								<span>Metric</span>
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Tag className="h-4 w-4" />
								<span>Labels</span>
							</div>
						</TableHead>
						<TableHead className="text-right">
							<div className="flex items-center justify-end gap-2">
								<Hash className="h-4 w-4" />
								<span>Value</span>
							</div>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{metrics.map((metric, metricIndex) =>
						metric.values.map((metricValue, valueIndex) => {
							const { formattedValue, displayUnit } = formatMetricValue(
								metricValue.value,
								metric.unit || undefined,
								metric.aggregation,
							);
							const isFirstRow = valueIndex === 0;
							const isLastRow = valueIndex === metric.values.length - 1;
							return (
								<TableRow
									key={`${metric.name}-${valueIndex}`}
									className={
										isLastRow && metricIndex < metrics.length - 1
											? "border-b-1 border-border cursor-pointer"
											: "border-b-0 cursor-pointer"
									}
									onClick={() => handleRowClick(metric, metricValue.labels)}
								>
									<TableCell>
										{isFirstRow ? (
											<div className="space-y-1">
												<div className="font-medium">{metric.name}</div>
												<div className="text-xs text-muted-foreground">
													{MetricAggregationLabel[metric.aggregation]}
												</div>
											</div>
										) : (
											<div className="text-xs text-muted-foreground"></div>
										)}
									</TableCell>
									<TableCell>
										<div className="flex gap-1 flex-wrap">
											{Object.entries(metricValue.labels).length > 0 ? (
												Object.entries(metricValue.labels).map(
													([key, value]) => (
														<LabelBadge
															key={`${key}-${value}`}
															labelKey={key}
															labelValue={value}
															readonly
														/>
													),
												)
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</div>
									</TableCell>
									<TableCell className="text-right font-semibold tabular-nums">
										{formattedValue}
										{displayUnit && (
											<span className="text-sm text-muted-foreground font-normal ml-1">
												{displayUnit}
											</span>
										)}
									</TableCell>
								</TableRow>
							);
						}),
					)}
				</TableBody>
			</Table>
		</>
	);
}
