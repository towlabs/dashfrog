"use client";

import { useEffect, useState } from "react";
import { FlowHistoryTable } from "@/components/FlowHistoryTable";
import type { StatusFilter } from "@/components/FlowStatusButtons";
import {
	FlowStatusButtons,
	FlowStatusButtonsSkeleton,
} from "@/components/FlowStatusButtons";
import { TableSkeleton } from "@/components/TableSkeleton";
import { CardHeader } from "@/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Flows } from "@/src/services/api/flows";
import { useTenantStore } from "@/src/stores/tenant";
import type { Filter } from "@/src/types/filter";
import type { DetailedFlow, Flow } from "@/src/types/flow";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

export interface FlowDetailProps {
	initialFlow: Flow | null;
	open: boolean;
	timeWindow: TimeWindow;
	onOpenChange: (open: boolean) => void;
}

export function FlowDetail({
	initialFlow,
	open,
	timeWindow,
	onOpenChange,
}: FlowDetailProps) {
	const currentTenant = useTenantStore((state) => state.currentTenant);
	// Local state for detailed flow data
	const [flowDetail, setFlowDetail] = useState<DetailedFlow | null>(null);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	// Fetch detailed flow when filters or time window change
	useEffect(() => {
		if (!currentTenant || !initialFlow) return;

		const fetchDetailedFlow = async (filters: Filter[]) => {
			setLoading(true);
			const { start, end } = resolveTimeWindow(timeWindow);
			try {
				const detailedFlow = await Flows.getDetailedFlow(
					currentTenant,
					initialFlow.name,
					start,
					end,
					filters,
				);
				setFlowDetail(detailedFlow);
			} catch (error) {
				console.error("Failed to fetch detailed flow:", error);
				setFlowDetail(null);
			} finally {
				setLoading(false);
			}
		};

		const filters = Object.entries(initialFlow.labels).map(
			([label, value]) => ({
				label,
				value: String(value),
			}),
		);
		const status = "all";

		setStatusFilter(status);

		void fetchDetailedFlow(filters);
	}, [currentTenant, initialFlow, timeWindow]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-5xl p-0 flex flex-col"
			>
				<SheetHeader className="flex-shrink-0">
					<CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
						<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-6">
							<SheetTitle className="text-2xl">
								{initialFlow?.name || "Flow Details"}
							</SheetTitle>
							<SheetDescription>
								Flow execution history and details
							</SheetDescription>
						</div>
						<div className="flex">
							{loading ? (
								<FlowStatusButtonsSkeleton />
							) : (
								flowDetail && (
									<FlowStatusButtons
										flow={flowDetail}
										statusFilter={statusFilter}
										onStatusFilterChange={setStatusFilter}
									/>
								)
							)}
						</div>
					</CardHeader>
				</SheetHeader>

				<div className="flex-1 flex flex-col px-6 py-6 overflow-hidden">
					<div className="flex flex-col h-full gap-2">
						{/* Flow History Table - Scrollable */}
						<div className="flex-1 overflow-y-auto">
							{loading || !flowDetail ? (
								<TableSkeleton columns={6} rows={10} />
							) : (
								<FlowHistoryTable
									detailedFlow={flowDetail}
									statusFilter={statusFilter}
								/>
							)}
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
