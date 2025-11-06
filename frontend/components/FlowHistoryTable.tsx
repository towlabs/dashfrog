"use client";

import { format } from "date-fns";
import { ChevronDown, ChevronRight, History, Tag } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { FlowStatus } from "@/components/FlowStatus";
import type { StatusFilter } from "@/components/FlowStatusButtons";
import { LabelBadge } from "@/components/LabelBadge";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
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
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Waterfall } from "@/components/Waterfall";
import { formatDuration, formatTimeAgo } from "@/src/lib/formatters";
import type { Filter } from "@/src/types/filter";
import type { DetailedFlow } from "@/src/types/flow";

type Props = {
	detailedFlow: DetailedFlow;
	statusFilter: StatusFilter;
	onAddFilter?: (filter: Filter) => void;
};

const ITEMS_PER_PAGE = 10;

export function FlowHistoryTable({
	detailedFlow,
	statusFilter,
	onAddFilter,
}: Props) {
	const [currentPage, setCurrentPage] = useState(1);
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

	const flowHistories = useMemo(() => detailedFlow.histories, [detailedFlow]);

	const filteredFlows = useMemo(() => {
		if (statusFilter === "all") {
			return flowHistories;
		}
		return flowHistories.filter((f) => f.status === statusFilter);
	}, [flowHistories, statusFilter]);

	// Calculate pagination
	const totalPages = Math.ceil(filteredFlows.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedFlows = filteredFlows.slice(startIndex, endIndex);

	// Reset to page 1 when filter changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to reset the page when the filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [statusFilter]);

	const handleAddFilter = (label: string, value: string) => {
		if (onAddFilter) {
			onAddFilter({ label, value });
		}
	};

	const handlePreviousPage = () => {
		setCurrentPage((prev) => Math.max(1, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	};

	const toggleRowExpansion = (index: number) => {
		setExpandedRows((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(index)) {
				newSet.delete(index);
			} else {
				newSet.add(index);
			}
			return newSet;
		});
	};

	if (filteredFlows.length === 0) {
		return (
			<EmptyState
				icon={History}
				title="No execution history"
				description="This flow hasn't been executed yet, or no runs match the selected filter."
			/>
		);
	}

	return (
		<TooltipProvider>
			<div className="space-y-4">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-8"></TableHead>
							<TableHead>Name</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Tag className="h-4 w-4" />
									<span>Labels</span>
								</div>
							</TableHead>
							<TableHead>Start</TableHead>
							<TableHead>End</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedFlows.map((flow, index) => {
							const rowIndex = startIndex + index;
							const isExpanded = expandedRows.has(rowIndex);
							return (
								<React.Fragment
									key={`${detailedFlow.name}-${rowIndex}-fragment`}
								>
									<TableRow
										key={`${detailedFlow.name}-${rowIndex}`}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => toggleRowExpansion(rowIndex)}
									>
										<TableCell className="w-8">
											{isExpanded ? (
												<ChevronDown className="h-4 w-4 text-muted-foreground" />
											) : (
												<ChevronRight className="h-4 w-4 text-muted-foreground" />
											)}
										</TableCell>
										<TableCell>
											<div className="font-medium">{detailedFlow.name}</div>
										</TableCell>
										<TableCell>
											<div
												className="flex flex-wrap gap-1"
												onClick={(e) => e.stopPropagation()}
											>
												{Object.entries(flow.labels).map(([key, value]) => (
													<LabelBadge
														key={key}
														labelKey={key}
														labelValue={value}
														onAddFilter={handleAddFilter}
													/>
												))}
											</div>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											<Tooltip>
												<TooltipTrigger className="cursor-default">
													{formatTimeAgo(flow.startTime)}
												</TooltipTrigger>
												<TooltipContent>
													{format(flow.startTime, "PPpp")}
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{flow.endTime ? (
												<Tooltip>
													<TooltipTrigger className="cursor-default">
														{formatTimeAgo(flow.endTime)}
													</TooltipTrigger>
													<TooltipContent>
														{format(flow.endTime, "PPpp")}
													</TooltipContent>
												</Tooltip>
											) : (
												"-"
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{formatDuration(flow.startTime, flow.endTime)}
										</TableCell>
										<TableCell>
											<FlowStatus status={flow.status} />
										</TableCell>
									</TableRow>
									{isExpanded && (
										<TableRow key={`${detailedFlow.name}-${rowIndex}-expanded`}>
											<TableCell colSpan={7} className="bg-muted/30 p-0">
												<div className="px-4">
													<Waterfall
														steps={flow.steps}
														events={flow.events}
														startTime={flow.startTime}
														endTime={flow.endTime}
													/>
												</div>
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							);
						})}
					</TableBody>
				</Table>

				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="flex items-center justify-end">
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										href="#"
										size="default"
										onClick={(e) => {
											e.preventDefault();
											handlePreviousPage();
										}}
										className={
											currentPage === 1
												? "pointer-events-none opacity-50"
												: "cursor-pointer"
										}
									/>
								</PaginationItem>
								<PaginationItem>
									<div className="text-sm px-4">
										Page {currentPage} of {totalPages}
									</div>
								</PaginationItem>
								<PaginationItem>
									<PaginationNext
										href="#"
										size="default"
										onClick={(e) => {
											e.preventDefault();
											handleNextPage();
										}}
										className={
											currentPage === totalPages
												? "pointer-events-none opacity-50"
												: "cursor-pointer"
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				)}
			</div>
		</TooltipProvider>
	);
}
