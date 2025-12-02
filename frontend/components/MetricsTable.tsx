"use client";

import { CaseUpper, Tags } from "lucide-react";
import React, { useEffect, useState } from "react";
import { LabelBadge } from "@/components/LabelBadge";
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
import { Metrics } from "@/src/services/api/metrics";
import type { Metric } from "@/src/types/metric";

type MetricsTableProps = {
	tenant: string;
};

const ITEMS_PER_PAGE = 14;

export function MetricsTable({ tenant }: MetricsTableProps) {
	const [metrics, setMetrics] = useState<Metric[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);

	useEffect(() => {
		const fetchMetrics = async () => {
			setLoading(true);
			try {
				const metrics = await Metrics.list();
				setMetrics(metrics);
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
	}, [tenant]);

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
							<React.Fragment
								key={`${metric.prometheusName}-${rowIndex}-fragment`}
							>
								<TableRow className="group cursor-pointer hover:bg-muted/50">
									<TableCell>
										<span>{metric.prettyName}</span>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
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
