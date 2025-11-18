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
import type { DetailedFlow } from "@/src/types/flow";

type Props = {
	detailedFlow: DetailedFlow | null;
	statusFilter: StatusFilter;
};

const ITEMS_PER_PAGE = 10;

export function FlowHistoryTable({ detailedFlow, statusFilter }: Props) {
	const [currentPage, setCurrentPage] = useState(1);
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

	const flowHistories = useMemo(
		() => detailedFlow?.history || [],
		[detailedFlow],
	);

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
						{paginatedFlows.map((flow, index) => {
							const rowIndex = startIndex + index;
							const isExpanded = expandedRows.has(rowIndex);
							return (
								<React.Fragment
									key={`${detailedFlow?.name}-${rowIndex}-fragment`}
								>
									<TableRow
										key={`${detailedFlow?.name}-${rowIndex}`}
										className="hover:bg-muted/50"
									>
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
												{Object.entries(flow.labels).map(([key, value]) => (
													<LabelBadge
														key={key}
														labelKey={key}
														labelValue={value}
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
										<TableRow
											key={`${detailedFlow?.name}-${rowIndex}-expanded`}
										>
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
						{filteredFlows.length === 0 && (
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
