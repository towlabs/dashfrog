"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CircleDot, Clock, Hash, PlayCircle, Timer, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import type { Flow } from "@/src/types/flow";
import { FlowStatus } from "@/components/FlowStatus";
import { FlowDetail } from "@/components/FlowDetail";
import { FlowStatusButtons } from "@/components/FlowStatusButtons";
import type { StatusFilter } from "@/components/FlowStatusButtons";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { CardHeader } from "@/components/ui/card";

type Props = {
	flows: Flow[];
	onAddFilter?: (filter: Filter) => void;
};

export function FlowTable({ flows, onAddFilter }: Props) {
	const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	const handleAddFilter = (label: string, value: string) => {
		if (onAddFilter) {
			onAddFilter({ label, value });
		}
	};

	const handleFlowClick = (flow: Flow) => {
		setSelectedFlow(flow);
		setDetailOpen(true);
	};

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
			<TooltipProvider>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								<div className="flex items-center gap-2">
									<PlayCircle className="h-4 w-4" />
									<span>Name</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<CircleDot className="h-4 w-4" />
									<span>Last Status</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Clock className="h-4 w-4" />
									<span>Last Start</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Clock className="h-4 w-4" />
									<span>Last End</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Timer className="h-4 w-4" />
									<span>Last Duration</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Hash className="h-4 w-4" />
									<span>Run Counts</span>
								</div>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{flows.map((flow, index) => {
							return (
								<TableRow
									key={`${flow.name}-${index}`}
									onClick={() => handleFlowClick(flow)}
									className="cursor-pointer"
								>
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
			</TooltipProvider>

			{/* Flow Detail Sheet */}
			<Sheet open={detailOpen} onOpenChange={setDetailOpen}>
				<SheetContent className="sm:max-w-[1000px] w-full p-0 flex flex-col gap-0">
					<SheetHeader className="flex-shrink-0">
						<CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
							<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-6">
								<SheetTitle className="text-2xl">
									{selectedFlow?.name || "Flow Details"}
								</SheetTitle>
								<SheetDescription>
									Flow execution history and details
								</SheetDescription>
							</div>
							<div className="flex">
								{selectedFlow && (
									<FlowStatusButtons
										flow={selectedFlow}
										statusFilter={statusFilter}
										onStatusFilterChange={setStatusFilter}
									/>
								)}
							</div>
						</CardHeader>
					</SheetHeader>

					<div className="flex-1 flex flex-col px-6 py-6 overflow-hidden">
						{selectedFlow && (
							<FlowDetail flow={selectedFlow} statusFilter={statusFilter} />
						)}
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
