"use client";

import { CaseUpper, ChartLine, Tags } from "lucide-react";
import React, { useEffect, useState } from "react";
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
import { Metrics } from "@/src/services/api/metrics";
import type { Filter } from "@/src/types/filter";
import type { InstantAggregation, RangeAggregation } from "@/src/types/metric";
import type { TimeWindow } from "@/src/types/timewindow";

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
	const [instantMetrics, setInstantMetrics] = useState<
		Metric<InstantAggregation>[]
	>([]);
	const [rangeMetrics, setRangeMetrics] = useState<Metric<RangeAggregation>[]>(
		[],
	);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedMetric, setSelectedMetric] = useState<{
		metric: Metric<RangeAggregation | InstantAggregation>;
	} | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);

	useEffect(() => {
		const fetchMetrics = async () => {
			setLoading(true);
			try {
				const { instant, range } = await Metrics.list();
				setInstantMetrics(instant);
				setRangeMetrics(range);
			} catch (error) {
				console.error("Failed to fetch metrics:", error);
				setInstantMetrics([]);
				setRangeMetrics([]);
			} finally {
				setLoading(false);
			}
		};

		if (tenant) {
			void fetchMetrics();
		}
	}, [tenant]);

	const handleRowClick = (
		metric: Metric<RangeAggregation | InstantAggregation>,
	) => {
		setSelectedMetric({ metric });
		setDrawerOpen(true);
	};

	const totalPages = Math.ceil(metrics.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedRows = metrics.slice(startIndex, endIndex);

	const handlePreviousPage = () => {
		setCurrentPage((prev) => Math.max(1, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	};

	if (loading) {
		return <TableSkeleton columns={2} rows={5} />;
	}

	return (
		<>
			{selectedMetric && (
				<MetricDetailDrawer
					open={drawerOpen}
					onOpenChange={setDrawerOpen}
					metric={selectedMetric.metric}
					timeWindow={timeWindow}
					filters={filters}
				/>
			)}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<div className="flex items-center gap-2">
								<CaseUpper className="size-4" strokeWidth={2.5} />
								<span>Name</span>
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Tags className="size-4" strokeWidth={2.5} />
								<span>Labels</span>
							</div>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{paginatedRows.map((metric, index) => {
						const rowIndex = startIndex + index;

						return (
							<React.Fragment key={`${metric.name}-${rowIndex}-fragment`}>
								<TableRow className="group cursor-pointer hover:bg-muted/50">
									<TableCell>
										<div className="relative flex items-center gap-2">
											<span>{metric.prettyName}</span>
											<Tooltip>
												<TooltipTrigger asChild>
													<div
														className="absolute -right-3 -top-2 px-2 py-1.5 rounded-b-lg border border-t-0 bg-background group-hover:opacity-100 transition-opacity cursor-pointer z-10 flex items-center gap-1 opacity-0 shadow-xs "
														onClick={(e) => {
															e.stopPropagation();
															handleRowClick(metric);
														}}
													>
														<ChartLine className="size-4 text-muted-foreground" />
														<span className="text-xs text-muted-foreground ">
															Values
														</span>
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
											{metric.labels.map((label) => (
												<LabelBadge key={label} labelKey={label} readonly />
											))}
										</div>
									</TableCell>
								</TableRow>
							</React.Fragment>
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
