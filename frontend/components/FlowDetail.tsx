"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { FlowHistory } from "@/src/types/flow";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

export interface FlowDetailProps {
	flowName: string;
	open: boolean;
	startDate: Date;
	endDate: Date;
	labels: Record<string, string>;
	onOpenChange: (open: boolean) => void;
}

export function FlowDetail({
	flowName,
	open,
	startDate,
	endDate,
	labels,
	onOpenChange,
}: FlowDetailProps) {
	const currentTenant = useTenantStore((state) => state.currentTenant);
	// Local state for detailed flow data
	const [flowHistory, setFlowHistory] = useState<FlowHistory[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	// biome-ignore lint/correctness/useExhaustiveDependencies: recompute when time we open the sheet
	// Fetch detailed flow when filters or time window change
	useEffect(() => {
		if (!currentTenant || !open) return;

		const fetchFlowHistory = async () => {
			setLoading(true);
			try {
				const response = await Flows.getFlowHistory(
					currentTenant,
					flowName,
					startDate,
					endDate,
					Object.entries(labels).map(([key, value]) => ({
						label: key,
						value: value,
					})),
				);
				setFlowHistory(response);
			} catch (error) {
				console.error("Failed to fetch flow history:", error);
				setFlowHistory([]);
			} finally {
				setLoading(false);
			}
		};

		const status = "all";

		setStatusFilter(status);

		void fetchFlowHistory();
	}, [currentTenant, flowName, labels, startDate, endDate, open]);

	const failedCount = useMemo(
		() => flowHistory?.filter((f) => f.status === "failure").length || 0,
		[flowHistory],
	);
	const successCount = useMemo(
		() => flowHistory?.filter((f) => f.status === "success").length || 0,
		[flowHistory],
	);
	const pendingCount = useMemo(
		() => flowHistory?.filter((f) => f.status === "running").length || 0,
		[flowHistory],
	);
	const runCount = useMemo(() => flowHistory?.length || 0, [flowHistory]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-5xl p-0 flex flex-col"
			>
				<SheetHeader className="flex-shrink-0">
					<CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
						<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-6">
							<SheetTitle className="text-2xl">{flowName}</SheetTitle>
							<SheetDescription>
								Flow execution history and details
							</SheetDescription>
						</div>
						<div className="flex">
							{loading && flowHistory === null ? (
								<FlowStatusButtonsSkeleton />
							) : (
								flowName && (
									<FlowStatusButtons
										failedCount={failedCount}
										successCount={successCount}
										pendingCount={pendingCount}
										runCount={runCount}
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
							{loading && flowHistory === null ? (
								<TableSkeleton columns={6} rows={10} />
							) : (
								<FlowHistoryTable
									flowHistory={flowHistory || []}
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
