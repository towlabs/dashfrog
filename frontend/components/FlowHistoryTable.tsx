"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { formatDuration, formatTimeAgo } from "@/src/lib/formatters";
import type { Filter } from "@/src/types/filter";
import type { FlowHistory } from "@/src/types/flow";
import { FlowStatus } from "@/components/FlowStatus";
import type { StatusFilter } from "@/components/FlowStatusButtons";

type Props = {
	flowHistories: FlowHistory[];
	statusFilter: StatusFilter;
	onAddFilter?: (filter: Filter) => void;
};

const ITEMS_PER_PAGE = 10;

export function FlowHistoryTable({
	flowHistories,
	statusFilter,
	onAddFilter,
}: Props) {
	const [currentPage, setCurrentPage] = useState(1);

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

	return (
		<TooltipProvider>
			<div className="space-y-4">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Start</TableHead>
							<TableHead>End</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedFlows.map((flow, index) => (
							<TableRow key={`${flow.name}-${startIndex + index}`}>
								<TableCell>
									<div className="space-y-2">
										<div className="font-medium">{flow.name}</div>
										<div className="flex flex-wrap gap-1">
											{Object.entries(flow.labels).map(([key, value]) => (
												<ContextMenu key={key}>
													<ContextMenuTrigger>
														<Badge
															variant="secondary"
															className="h-5 px-2 text-xs font-normal border-0"
														>
															{key}={value}
														</Badge>
													</ContextMenuTrigger>
													<ContextMenuContent>
														<ContextMenuItem
															onClick={() => handleAddFilter(key, value)}
														>
															Add to filters
														</ContextMenuItem>
													</ContextMenuContent>
												</ContextMenu>
											))}
										</div>
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
						))}
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
