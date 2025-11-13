"use client";

import {
	CaseUpper,
	ChartLine,
	Hash,
	ScatterChart,
	Tag,
	Tags,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LabelBadge } from "@/components/LabelBadge";
import { MetricDetailDrawer } from "@/components/MetricDetailDrawer";
import { SimplePagination } from "@/components/SimplePagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Metrics, toMetric } from "@/src/services/api/metrics";
import type { Filter } from "@/src/types/filter";
import type { Metric } from "@/src/types/metric";
import { MetricAggregationLabel } from "@/src/types/metric";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";
import { formatMetricValue } from "@/src/utils/metricFormatting";

type MetricsTableProps = {
	tenant: string;
	timeWindow: TimeWindow;
	filters: Filter[];
};

const ITEMS_PER_PAGE = 14;

export function MetricsTable({
	tenant,
	timeWindow,
	filters,
}: MetricsTableProps) {
	const [metrics, setMetrics] = useState<Metric[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedMetric, setSelectedMetric] = useState<{
		metric: Metric;
		labels: Record<string, string>;
	} | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);

	useEffect(() => {
		const fetchMetrics = async () => {
			setLoading(true);
			try {
				const { start, end } = resolveTimeWindow(timeWindow);
				const response = await Metrics.getByTenant(tenant, start, end, filters);
				const fetchedMetrics = response.data.map(toMetric);
				setMetrics(fetchedMetrics);
			} catch (error) {
				console.error("Failed to fetch metrics:", error);
				setMetrics([]);
			} finally {
				setLoading(false);
			}
		};

		if (tenant) {
			void fetchMetrics();
		}
	}, [tenant, timeWindow, filters]);

	const handleRowClick = (metric: Metric, labels: Record<string, string>) => {
		setSelectedMetric({ metric, labels });
		setDrawerOpen(true);
	};

	// Flatten all metric rows for pagination
	const allRows = metrics.flatMap((metric) =>
		metric.values.map((metricValue, valueIndex) => ({
			metric,
			metricValue,
			valueIndex,
		})),
	);

	const totalPages = Math.ceil(allRows.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedRows = allRows.slice(startIndex, endIndex);

	const handlePreviousPage = () => {
		setCurrentPage((prev) => Math.max(1, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	};

	if (loading) {
		return <TableSkeleton columns={3} rows={5} />;
	}

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
								<CaseUpper className="h-4 w-4" strokeWidth={2.5} />
								<span>Name</span>
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Tags className="h-4 w-4" strokeWidth={2.5} />
								<span>Labels</span>
							</div>
						</TableHead>
						<TableHead className="text-right">
							<div className="flex items-center gap-2">
								<Hash className="h-4 w-4" strokeWidth={2.5} />
								<span>Value</span>
							</div>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{paginatedRows.map((row, index) => {
						const { formattedValue, displayUnit } = formatMetricValue(
							row.metricValue.value,
							row.metric.unit || undefined,
							row.metric.aggregation,
						);
						return (
							<TableRow
								key={`${row.metric.name}-${row.valueIndex}-${startIndex + index}`}
								className="group"
							>
								<TableCell>
									<div className="relative flex items-center">
										<span>
											{MetricAggregationLabel[row.metric.aggregation]} of{" "}
											{row.metric.name}
										</span>
										<Tooltip>
											<TooltipTrigger asChild>
												<div
													className="absolute right-0 p-1 rounded border shadow-sm bg-background opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
													onClick={(e) => {
														e.stopPropagation();
														handleRowClick(row.metric, row.metricValue.labels);
													}}
												>
													<ChartLine className="h-5 w-5 text-muted-foreground" />
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>View metric history</p>
											</TooltipContent>
										</Tooltip>
									</div>
								</TableCell>
								<TableCell>
									<div className="flex gap-1">
										{Object.entries(row.metricValue.labels).length > 0 ? (
											Object.entries(row.metricValue.labels).map(
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
					})}
				</TableBody>
			</Table>
			<SimplePagination
				currentPage={currentPage}
				totalPages={totalPages}
				onPreviousPage={handlePreviousPage}
				onNextPage={handleNextPage}
			/>
		</>
	);
}
