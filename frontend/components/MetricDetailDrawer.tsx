import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { MetricHistoryChart } from "@/components/MetricHistoryChart";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import {
	type MetricHistoryResponse,
	Metrics,
} from "@/src/services/api/metrics";
import { useTenantStore } from "@/src/stores/tenant";
import type { Filter } from "@/src/types/filter";
import type { Metric } from "@/src/types/metric";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

type MetricDetailDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	metric: Metric;
	timeWindow: TimeWindow;
	filters: Filter[];
};

export function MetricDetailDrawer({
	open,
	onOpenChange,
	metric,
	timeWindow,
	filters,
}: MetricDetailDrawerProps) {
	const [historyData, setHistoryData] = useState<MetricHistoryResponse | null>(
		null,
	);
	const [loading, setLoading] = useState(false);
	const currentTenant = useTenantStore((state) => state.currentTenant);

	useEffect(() => {
		if (!open || !currentTenant) return;

		const fetchHistory = async () => {
			setLoading(true);
			try {
				const { start, end } = resolveTimeWindow(timeWindow);
				const response = await Metrics.getHistory(
					currentTenant,
					metric.name,
					metric.unit,
					start,
					end,
					filters,
				);
				setHistoryData(response);
			} catch (error) {
				console.error("Failed to fetch metric history:", error);
			} finally {
				setLoading(false);
			}
		};

		void fetchHistory();
	}, [metric, open, currentTenant, filters, timeWindow]);

	if (!metric) return null;

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle className="flex items-center justify-between">
						<div className="space-y-2">
							<div className="text-2xl font-bold">{metric.prettyName}</div>
						</div>
						<DrawerClose asChild>
							<Button variant="ghost" size="icon">
								<X className="h-4 w-4" />
							</Button>
						</DrawerClose>
					</DrawerTitle>
				</DrawerHeader>

				<div className="px-4 pb-10">
					{loading ? (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>Loading metric history...</p>
						</div>
					) : historyData && historyData.series.length > 0 ? (
						<MetricHistoryChart historyData={historyData} metric={metric} />
					) : (
						<div className="rounded-lg border p-8 text-center text-muted-foreground">
							<p>No metric history data available</p>
						</div>
					)}
				</div>
			</DrawerContent>
		</Drawer>
	);
}
