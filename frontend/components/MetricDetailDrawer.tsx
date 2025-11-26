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
	MetricHistoryPoint,
	type MetricHistoryResponse,
	Metrics,
} from "@/src/services/api/metrics";
import { useTenantStore } from "@/src/stores/tenant";
import type { Filter } from "@/src/types/filter";
import type { GroupByFn, RangeMetric } from "@/src/types/metric";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

type MetricDetailDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	metric: RangeMetric;
	startDate: Date;
	endDate: Date;
	filters: Filter[];
	tenantName: string;
	groupBy: string[];
	groupByFn: GroupByFn;
};

export function MetricDetailDrawer({
	open,
	onOpenChange,
	metric,
	tenantName,
	startDate,
	endDate,
	filters,
	groupBy,
	groupByFn,
}: MetricDetailDrawerProps) {
	const [historyData, setHistoryData] = useState<{
		series: {
			labels: Record<string, string>;
			values: MetricHistoryPoint[];
		}[];
	}>({ series: [] });

	useEffect(() => {
		const fetchHistory = async () => {
			try {
				const response = await Metrics.getHistory(
					tenantName,
					metric.prometheusName,
					metric.transform,
					startDate,
					endDate,
					filters,
					groupBy,
					groupByFn,
				);
				setHistoryData(response);
			} catch (error) {
				console.error("Failed to fetch metric history:", error);
				setHistoryData({ series: [] });
			}
		};
		if (!open) return;

		void fetchHistory();
	}, [
		tenantName,
		metric.prometheusName,
		startDate,
		endDate,
		filters,
		groupBy,
		groupByFn,
		metric.transform,
		open,
	]);

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
					<MetricHistoryChart
						historyData={historyData}
						metric={metric}
						startDate={startDate}
						endDate={endDate}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
