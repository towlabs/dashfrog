"use client";

import { Tag, Workflow } from "lucide-react";
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
import { Flows } from "@/src/services/api/flows";
import type { StaticFlow } from "@/src/types/flow";

type StaticFlowTableProps = {
	tenant: string;
};

const ITEMS_PER_PAGE = 14;

export function StaticFlowTable({ tenant }: StaticFlowTableProps) {
	const [flows, setFlows] = useState<StaticFlow[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);

	useEffect(() => {
		const fetchFlows = async () => {
			setLoading(true);
			try {
				const response = await Flows.list();
				setFlows(response);
			} catch (error) {
				console.error("Failed to fetch flows:", error);
				setFlows([]);
			} finally {
				setLoading(false);
			}
		};

		if (tenant) {
			void fetchFlows();
		}
	}, [tenant]);

	const totalPages = Math.ceil(flows.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedRows = flows.slice(startIndex, endIndex);

	const handlePreviousPage = () => {
		setCurrentPage((prev) => Math.max(1, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	};

	if (loading) {
		return <TableSkeleton columns={2} rows={5} />;
	}

	if (flows.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				No flows found
			</div>
		);
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<div className="flex items-center gap-2">
								<Workflow className="size-4" strokeWidth={2.5} />
								<span>Flow Name</span>
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Tag className="size-4" strokeWidth={2.5} />
								<span>Labels</span>
							</div>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{paginatedRows.map((flow, index) => {
						const rowIndex = startIndex + index;

						return (
							<React.Fragment key={`${flow.name}-${rowIndex}-fragment`}>
								<TableRow className="hover:bg-muted/50">
									<TableCell>
										<span>{flow.name}</span>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{flow.labels.map((label) => (
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
