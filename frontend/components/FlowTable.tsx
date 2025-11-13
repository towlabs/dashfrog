"use client";

import { format } from "date-fns";
import {
	CaseUpper,
	ChartNoAxesGantt,
	CircleDot,
	Clock,
	Hash,
	Tag,
	Tags,
	Timer,
	Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { FlowDetail } from "@/components/FlowDetail";
import { FlowStatus } from "@/components/FlowStatus";
import { LabelBadge } from "@/components/LabelBadge";
import { SimplePagination } from "@/components/SimplePagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDuration, formatTimeAgo } from "@/src/lib/formatters";
import { Flows, toFlow } from "@/src/services/api/flows";
import type { Filter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

type Props = {
	tenant: string;
	timeWindow: TimeWindow;
	filters: Filter[];
};

const ITEMS_PER_PAGE = 14;

export function FlowTable({ tenant, timeWindow, filters }: Props) {
	const [flows, setFlows] = useState<Flow[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	useEffect(() => {
		const fetchFlows = async () => {
			setLoading(true);
			try {
				const { start, end } = resolveTimeWindow(timeWindow);
				const response = await Flows.getByTenant(tenant, start, end, filters);
				const fetchedFlows = response.data.map(toFlow);
				setFlows(fetchedFlows);
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
	}, [tenant, timeWindow, filters]);

	const handleFlowClick = (flow: Flow) => {
		setSelectedFlow(flow);
		setDetailOpen(true);
	};

	const totalPages = Math.ceil(flows.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedFlows = flows.slice(startIndex, endIndex);

	const handlePreviousPage = () => {
		setCurrentPage((prev) => Math.max(1, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	};

	if (loading) {
		return <TableSkeleton columns={6} rows={5} />;
	}

	if (flows.length === 0) {
		return (
			<EmptyState
				icon={Workflow}
				title="No flows yet"
				description="Flows will appear here once you start tracking workflow executions."
			/>
		);
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
						<TableHead>
							<div className="flex items-center gap-2">
								<CircleDot className="size-4" strokeWidth={2.5} />
								<span>Last Status</span>
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Clock className="size-4" strokeWidth={2.5} />
								<span>Last Start</span>
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Clock className="size-4" strokeWidth={2.5} />
								<span>Last End</span>
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Timer className="size-4" strokeWidth={2.5} />
								<span>Last Duration</span>
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Hash className="size-4" strokeWidth={2.5} />
								<span>Run Counts</span>
							</div>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{paginatedFlows.map((flow, index) => {
						return (
							<TableRow key={`${flow.name}-${index}`} className="group">
								<TableCell>
									<div className="relative flex items-center">
										<span className="font-medium">{flow.name}</span>
										<Tooltip>
											<TooltipTrigger asChild>
												<div
													className="absolute right-0 p-1 rounded border shadow-sm bg-background opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
													onClick={() => handleFlowClick(flow)}
												>
													<ChartNoAxesGantt className="size-5 text-muted-foreground" />
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>View flow details</p>
											</TooltipContent>
										</Tooltip>
									</div>
								</TableCell>
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
								<TableCell>
									<FlowStatus status={flow.lastRunStatus} />
								</TableCell>
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
								<TableCell className="text-muted-foreground text-sm">
									{formatDuration(flow.lastRunStartedAt, flow.lastRunEndedAt)}
								</TableCell>
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

			{/* Flow Detail Sheet */}
			<FlowDetail
				initialFlow={selectedFlow}
				open={detailOpen}
				onOpenChange={setDetailOpen}
			/>
		</>
	);
}
