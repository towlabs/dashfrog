"use client";

import { format } from "date-fns";
import {
	CaseUpper,
	ChartNoAxesGantt,
	CircleDot,
	Clock,
	Hash,
	Tags,
	Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FlowDetail } from "@/components/FlowDetail";
import { FlowStatus } from "@/components/FlowStatus";
import { LabelBadge } from "@/components/LabelBadge";
import { SimplePagination } from "@/components/SimplePagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Badge } from "@/components/ui/badge";
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
import { formatDuration, formatTimeAgo } from "@/src/lib/formatters";
import { Flows } from "@/src/services/api/flows";
import type { Filter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

type Props = {
	tenant: string;
	startDate: Date;
	endDate: Date;
	filters: Filter[];
	visibleColumns?: {
		name?: boolean;
		labels?: boolean;
		lastStatus?: boolean;
		lastStart?: boolean;
		lastEnd?: boolean;
		lastDuration?: boolean;
		runCounts?: boolean;
	};
};

const ITEMS_PER_PAGE = 14;

export function FlowTable({
	tenant,
	startDate,
	endDate,
	filters,
	visibleColumns = {
		name: true,
		labels: true,
		lastStatus: true,
		lastStart: true,
		lastEnd: true,
		lastDuration: true,
		runCounts: true,
	},
}: Props) {
	const [flows, setFlows] = useState<Flow[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	useEffect(() => {
		const fetchFlows = async () => {
			setLoading(true);
			try {
				const fetchedFlows = await Flows.getByTenant(
					tenant,
					startDate,
					endDate,
					filters,
				);
				setFlows(fetchedFlows);
			} finally {
				setLoading(false);
			}
		};

		if (tenant) {
			void fetchFlows();
		}
	}, [tenant, startDate, endDate, filters]);

	const handleFlowClick = (flow: Flow) => {
		setSelectedFlow(flow);
		setDetailOpen(true);
	};

	const totalPages = Math.ceil(flows?.length || 0 / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedFlows = flows?.slice(startIndex, endIndex) || [];

	const handlePreviousPage = () => {
		setCurrentPage((prev) => Math.max(1, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	};

	if (loading && flows === null) {
		return <TableSkeleton columns={6} rows={5} />;
	}

	return (
		<>
			<Table className="table-fixed">
				<TableHeader>
					<TableRow>
						{visibleColumns.name && (
							<TableHead className="w-48">
								<div className="flex items-center gap-2">
									<CaseUpper className="size-4" strokeWidth={2.5} />
									<span>Name</span>
								</div>
							</TableHead>
						)}
						{visibleColumns.labels && (
							<TableHead className="w-auto">
								<div className="flex items-center gap-2">
									<Tags className="size-4" strokeWidth={2.5} />
									<span>Labels</span>
								</div>
							</TableHead>
						)}
						{visibleColumns.lastStatus && (
							<TableHead className="w-24">
								<div className="flex items-center gap-2">
									<CircleDot className="size-4" strokeWidth={2.5} />
									<span>Last Status</span>
								</div>
							</TableHead>
						)}
						{visibleColumns.lastStart && (
							<TableHead className="w-36">
								<div className="flex items-center gap-2">
									<Clock className="size-4" strokeWidth={2.5} />
									<span>Last Start</span>
								</div>
							</TableHead>
						)}
						{visibleColumns.lastEnd && (
							<TableHead className="w-36">
								<div className="flex items-center gap-2">
									<Clock className="size-4" strokeWidth={2.5} />
									<span>Last End</span>
								</div>
							</TableHead>
						)}
						{visibleColumns.lastDuration && (
							<TableHead className="w-28">
								<div className="flex items-center gap-2">
									<Timer className="size-4" strokeWidth={2.5} />
									<span>Last Duration</span>
								</div>
							</TableHead>
						)}
						{visibleColumns.runCounts && (
							<TableHead className="w-28">
								<div className="flex items-center gap-2">
									<Hash className="size-4" strokeWidth={2.5} />
									<span>Run Counts</span>
								</div>
							</TableHead>
						)}
					</TableRow>
				</TableHeader>
				<TableBody>
					{paginatedFlows.map((flow, index) => {
						return (
							<TableRow key={`${flow.name}-${index}`} className="group">
								{visibleColumns.name && (
									<TableCell className="group-hover:opacity-100 transition-opacity">
										<div className="relative flex items-center">
											<span className="font-medium">{flow.name}</span>
											<Tooltip>
												<TooltipTrigger asChild>
													<div
														className="absolute -right-3 -top-2 px-2 py-1.5 rounded-b-lg border border-t-0 bg-background group-hover:opacity-100 transition-opacity cursor-pointer z-10 flex items-center gap-1 opacity-0 shadow-xs "
														onClick={() => handleFlowClick(flow)}
													>
														<ChartNoAxesGantt className="size-4 text-muted-foreground" />
														<span className="text-xs text-muted-foreground ">
															Details
														</span>
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p>View flow details</p>
												</TooltipContent>
											</Tooltip>
										</div>
									</TableCell>
								)}
								{visibleColumns.labels && (
									<TableCell>
										<div
											className="flex gap-1"
											onClick={(e) => e.stopPropagation()}
										>
											{Object.entries(flow.labels).map(([key, value]) => (
												<div key={key} className="cursor-pointer">
													<LabelBadge
														labelKey={key}
														labelValue={value}
														readonly
													/>
												</div>
											))}
										</div>
									</TableCell>
								)}
								{visibleColumns.lastStatus && (
									<TableCell>
										<FlowStatus status={flow.lastRunStatus} />
									</TableCell>
								)}
								{visibleColumns.lastStart && (
									<TableCell className="text-muted-foreground text-sm">
										<Tooltip>
											<TooltipTrigger className="cursor-default">
												{formatTimeAgo(flow.lastRunStartedAt)}
											</TooltipTrigger>
											<TooltipContent>
												{format(flow.lastRunStartedAt, "PPpp")}
											</TooltipContent>
										</Tooltip>
									</TableCell>
								)}
								{visibleColumns.lastEnd && (
									<TableCell className="text-muted-foreground text-sm">
										{flow.lastRunEndedAt ? (
											<Tooltip>
												<TooltipTrigger className="cursor-default">
													{formatTimeAgo(flow.lastRunEndedAt)}
												</TooltipTrigger>
												<TooltipContent>
													{format(flow.lastRunEndedAt, "PPpp")}
												</TooltipContent>
											</Tooltip>
										) : (
											"-"
										)}
									</TableCell>
								)}
								{visibleColumns.lastDuration && (
									<TableCell className="text-muted-foreground text-sm">
										{formatDuration({
											startTime: flow.lastRunStartedAt,
											endTime: flow.lastRunEndedAt,
										})}
									</TableCell>
								)}
								{visibleColumns.runCounts && (
									<TableCell>
										<div className="flex items-center gap-1.5">
											<Badge
												variant="outline"
												className="border-0 bg-[#dbe6dd] text-green-700 h-6 px-2 text-xs font-medium"
											>
												{flow.successCount}
											</Badge>
											<Badge
												variant="outline"
												className="border-0 bg-[#d2e4f8] text-blue-700 h-6 px-2 text-xs font-medium"
											>
												{flow.pendingCount}
											</Badge>
											<Badge
												variant="outline"
												className="border-0 bg-[#f9dcd9] text-red-700 h-6 px-2 text-xs font-medium"
											>
												{flow.failedCount}
											</Badge>
										</div>
									</TableCell>
								)}
							</TableRow>
						);
					})}
					{flows?.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={Object.keys(visibleColumns).length}
								className="text-center text-secondary-foreground text-sm py-6"
							>
								No flows found for the selected time window.
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

			{/* Flow Detail Sheet */}
			{selectedFlow && (
				<FlowDetail
					labels={selectedFlow.labels}
					flowName={selectedFlow.name}
					open={detailOpen}
					startDate={startDate}
					endDate={endDate}
					onOpenChange={setDetailOpen}
				/>
			)}
		</>
	);
}
