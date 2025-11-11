"use client";

import { format } from "date-fns";
import {
	ChartNoAxesGantt,
	CircleDot,
	Clock,
	Hash,
	PlayCircle,
	Tag,
	Timer,
	Workflow,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { FlowDetail } from "@/components/FlowDetail";
import { FlowStatus } from "@/components/FlowStatus";
import { LabelBadge } from "@/components/LabelBadge";
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
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDuration, formatTimeAgo } from "@/src/lib/formatters";
import type { Filter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";

type Props = {
	flows: Flow[];
	onAddFilter?: (filter: Filter) => void;
};

export function FlowTable({ flows, onAddFilter }: Props) {
	const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

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
									<ChartNoAxesGantt className="h-4 w-4" />
									<span>Name</span>
								</div>
							</TableHead>
							<TableHead>
								<div className="flex items-center gap-2">
									<Tag className="h-4 w-4" />
									<span>Labels</span>
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
										<div className="font-medium">{flow.name}</div>
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
			<FlowDetail
				initialFlow={selectedFlow}
				open={detailOpen}
				onOpenChange={setDetailOpen}
			/>
		</>
	);
}
