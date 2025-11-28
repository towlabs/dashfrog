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
import { type MetricHistoryPoint, Metrics } from "@/src/services/api/metrics";
import type { Filter } from "@/src/types/filter";
import type { GroupByFn, Transform } from "@/src/types/metric";

type MetricDetailDrawerProps = {
	notebookId?: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	startDate: Date;
	endDate: Date;
	filters: Filter[];
	tenantName: string;
	groupBy: string[];
	groupByFn: GroupByFn;
	metricName: string;
	transform: Transform | null;
	prettyName: string;
	unit: string | null;
};

export function MetricDetailDrawer({
	notebookId = null,
	open,
	onOpenChange,
	metricName,
	prettyName,
	transform,
	tenantName,
	startDate,
	endDate,
	filters,
	groupBy,
	groupByFn,
	unit,
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
					metricName,
					transform,
					startDate,
					endDate,
					filters,
					groupBy,
					groupByFn,
					notebookId,
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
		metricName,
		transform,
		startDate,
		endDate,
		filters,
		groupBy,
		groupByFn,
		open,
		notebookId,
	]);

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle className="flex items-center justify-between">
						<div className="space-y-2">
							<div className="text-2xl font-bold">{prettyName}</div>
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
						unit={unit}
						transform={transform}
						startDate={startDate}
						endDate={endDate}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
