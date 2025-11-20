"use client";

import { format } from "date-fns";
import {
	ChevronDown,
	ChevronRight,
	CircleDot,
	Clock,
	Tags,
	Timer,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { FlowStatus } from "@/components/FlowStatus";
import type { StatusFilter } from "@/components/FlowStatusButtons";
import { LabelBadge } from "@/components/LabelBadge";
import { SimplePagination } from "@/components/SimplePagination";
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
import type { FlowHistory } from "@/src/types/flow";

type Props = {
	flowHistory: FlowHistory[];
	statusFilter: StatusFilter;
};

const ITEMS_PER_PAGE = 10;

export function FlowHistoryTable({ flowHistory, statusFilter }: Props) {
	const [currentPage, setCurrentPage] = useState(1);
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

	const filteredHistory = useMemo(() => {
		if (statusFilter === "all") {
			return flowHistory;
		}
		return flowHistory.filter((f) => f.status === statusFilter);
	}, [flowHistory, statusFilter]);

	// Calculate pagination
	const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

	// Reset to page 1 when filter changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to reset the page when the filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [statusFilter]);

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

	return (
		<TooltipProvider>
			<div className="space-y-4">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-8"></TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Tags className="size-4" strokeWidth={2.5} />
									<span>Labels</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Clock className="size-4" strokeWidth={2.5} />
									<span>Start</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Clock className="size-4" strokeWidth={2.5} />
									<span>End</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Timer className="size-4" strokeWidth={2.5} />
									<span>Duration</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<CircleDot className="size-4" strokeWidth={2.5} />
									<span>Status</span>
								</div>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedHistory.map((history, index) => {
							const rowIndex = startIndex + index;
							const isExpanded = expandedRows.has(rowIndex);
							return (
								<React.Fragment key={`${rowIndex}-fragment`}>
									<TableRow key={`${rowIndex}`} className="hover:bg-muted/50">
										<TableCell
											className="w-8 cursor-pointer"
											onClick={() => toggleRowExpansion(rowIndex)}
										>
											{isExpanded ? (
												<ChevronDown className="size-4 text-muted-foreground" />
											) : (
												<ChevronRight className="size-4 text-muted-foreground" />
											)}
										</TableCell>
										<TableCell>
											<div
												className="flex flex-wrap gap-1"
												onClick={(e) => e.stopPropagation()}
											>
												{Object.entries(history.labels).map(([key, value]) => (
													<LabelBadge
														key={key}
														labelKey={key}
														labelValue={value as string}
													/>
												))}
											</div>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											<Tooltip>
												<TooltipTrigger className="cursor-default">
													{formatTimeAgo(history.startTime)}
												</TooltipTrigger>
												<TooltipContent>
													{format(history.startTime, "PPpp")}
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{history.endTime ? (
												<Tooltip>
													<TooltipTrigger className="cursor-default">
														{formatTimeAgo(history.endTime)}
													</TooltipTrigger>
													<TooltipContent>
														{format(history.endTime, "PPpp")}
													</TooltipContent>
												</Tooltip>
											) : (
												"-"
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{formatDuration(history.startTime, history.endTime)}
										</TableCell>
										<TableCell>
											<FlowStatus status={history.status} />
										</TableCell>
									</TableRow>
									{isExpanded && (
										<TableRow key={`${rowIndex}-expanded`}>
											<TableCell colSpan={7} className="bg-muted/30 p-0">
												<div className="px-4">
													<Waterfall
														steps={history.steps}
														events={history.events}
														startTime={history.startTime}
														endTime={history.endTime}
													/>
												</div>
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							);
						})}
						{filteredHistory.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-secondary-foreground text-sm py-6"
								>
									No execution history found for the selected filter.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				<SimplePagination
					currentPage={currentPage}
					totalPages={totalPages}
					onPreviousPage={handlePreviousPage}
					onNextPage={handleNextPage}
				/>
			</div>
		</TooltipProvider>
	);
}
