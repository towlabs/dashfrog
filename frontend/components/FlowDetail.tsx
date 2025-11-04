"use client";

import { useEffect, useMemo, useState } from "react";
import { FlowHistoryTable } from "@/components/FlowHistoryTable";
import { TenantControls } from "@/components/TenantControls";
import type { Flow, FlowHistory } from "@/src/types/flow";
import type { Filter } from "@/src/types/filter";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";
import { useLabelsStore } from "@/src/stores/labels";
import { useTenantStore } from "@/src/stores/tenant";
import { Flows, toFlowHistory } from "@/src/services/api/flows";

interface FlowDetailProps {
	flow: Flow;
	statusFilter: "all" | "running" | "success" | "failure";
}

export function FlowDetail({ flow, statusFilter }: FlowDetailProps) {
	const currentTenant = useTenantStore((state) => state.currentTenant);
	const availableLabels = useLabelsStore((state) => state.labels);

	// Local state for flow histories, filters, and time window
	const [flowHistories, setFlowHistories] = useState<FlowHistory[]>([]);
	const [loading, setLoading] = useState(false);

	// Initialize filters from flow's labels
	const initialFilters = useMemo(() => {
		return Object.entries(flow.labels).map(([label, value]) => ({
			label,
			value,
		}));
	}, [flow.labels]);

	const [filters, setFilters] = useState<Filter[]>(initialFilters);
	const [timeWindow, setTimeWindow] = useState<TimeWindow>({
		type: "relative",
		metadata: { value: "24h" },
	});

	// Fetch flow histories when filters or time window change
	useEffect(() => {
		if (!currentTenant) return;

		const fetchHistories = async () => {
			setLoading(true);
			const { start, end } = resolveTimeWindow(timeWindow);
			try {
				const response = await Flows.getHistory(
					currentTenant,
					flow.name,
					start,
					end,
					filters,
				);
				// Convert API response to frontend types
				const histories = response.data.map(toFlowHistory);
				setFlowHistories(histories);
			} catch (error) {
				console.error("Failed to fetch flow histories:", error);
				setFlowHistories([]);
			} finally {
				setLoading(false);
			}
		};

		void fetchHistories();
	}, [currentTenant, flow.name, timeWindow, filters]);

	const handleAddFilter = (filter: Filter) => {
		setFilters((prev) => [...prev, filter]);
	};

	return (
		<div className="flex flex-col h-full gap-2">
			{/* Controls - Fixed */}
			<div className="flex items-center justify-end flex-shrink-0">
				<TenantControls
					timeWindow={timeWindow}
					filters={filters}
					availableLabels={availableLabels}
					onTimeWindowChange={setTimeWindow}
					onFiltersChange={setFilters}
				/>
			</div>

			{/* Flow History Table - Scrollable */}
			<div className="flex-1 overflow-y-auto">
				{loading ? (
					<div className="flex items-center justify-center h-32 text-muted-foreground">
						Loading history...
					</div>
				) : (
					<FlowHistoryTable
						flowHistories={flowHistories}
						statusFilter={statusFilter}
						onAddFilter={handleAddFilter}
					/>
				)}
			</div>
		</div>
	);
}
