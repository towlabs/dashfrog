"use client";

import { Calendar, CaseUpper, PanelRight, Tags } from "lucide-react";
import { useEffect, useState } from "react";
import { LabelBadge } from "@/components/LabelBadge";
import { SimplePagination } from "@/components/SimplePagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { TimelineEventSheet } from "@/components/TimelineEventSheet";
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
import { formatTimeAgo } from "@/src/lib/formatters";
import { Timeline as TimelineAPI } from "@/src/services/api/timeline";
import type { Filter } from "@/src/types/filter";
import type { TimelineEvent } from "@/src/types/timeline";
import { resolveTimeWindow, type TimeWindow } from "@/src/types/timewindow";

const ITEMS_PER_PAGE = 14;

type TimelineProps = {
	tenant: string;
	timeWindow: TimeWindow;
	filters: Filter[];
	visibleColumns?: {
		event?: boolean;
		labels?: boolean;
		time?: boolean;
	};
};

export function Timeline({
	tenant,
	timeWindow,
	filters,
	visibleColumns = { event: true, labels: true, time: true },
}: TimelineProps) {
	const [events, setEvents] = useState<TimelineEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(
		null,
	);
	const [sheetOpen, setSheetOpen] = useState(false);

	useEffect(() => {
		const fetchTimeline = async () => {
			setLoading(true);
			try {
				const { start, end } = resolveTimeWindow(timeWindow);
				const timelineEvents = await TimelineAPI.getByTenant(
					tenant,
					start,
					end,
					filters,
				);
				setEvents(timelineEvents);
			} catch (error) {
				console.error("Failed to fetch timeline:", error);
				setEvents([]);
			} finally {
				setLoading(false);
			}
		};

		if (tenant) {
			void fetchTimeline();
		}
	}, [tenant, timeWindow, filters]);

	const handleEventClick = (event: TimelineEvent) => {
		setSelectedEvent(event);
		setSheetOpen(true);
	};

	if (loading) {
		return <TableSkeleton columns={4} rows={10} />;
	}

	// Pagination calculations
	const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedEvents = events.slice(startIndex, endIndex);

	const handlePreviousPage = () => {
		setCurrentPage((prev) => Math.max(1, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	};

	return (
		<div className="space-y-2">
			<Table>
				<TableHeader>
					<TableRow>
						{visibleColumns.event && (
							<TableHead>
								<div className="flex items-center gap-2">
									<CaseUpper className="size-4" strokeWidth={2.5} />
									Event
								</div>
							</TableHead>
						)}
						{visibleColumns.labels && (
							<TableHead className="text-right">
								<div className="flex items-center gap-2">
									<Tags className="size-4" strokeWidth={2.5} />
									Labels
								</div>
							</TableHead>
						)}
						{visibleColumns.time && (
							<TableHead className="w-64">
								<div className="flex items-center gap-2">
									<Calendar className="size-4" strokeWidth={2.5} />
									Time
								</div>
							</TableHead>
						)}
					</TableRow>
				</TableHeader>
				<TableBody>
					{paginatedEvents.map((event, index) => (
						<TableRow key={startIndex + index} className="group">
							{visibleColumns.event && (
								<TableCell>
									<div className="relative flex items-center">
										<span className="mr-2 text-lg">{event.emoji}</span>
										<span>{event.name}</span>
										<Tooltip>
											<TooltipTrigger asChild>
												<div
													className="absolute -right-3 -top-2 px-2 py-1.5 rounded-b-lg border border-t-white bg-background group-hover:opacity-100 transition-opacity cursor-pointer z-10 flex items-center gap-1 opacity-0 shadow-xs "
													onClick={(e) => {
														e.stopPropagation();
														handleEventClick(event);
													}}
												>
													<PanelRight className="size-4 text-muted-foreground" />
													<span className="text-xs text-muted-foreground ">
														Details
													</span>
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>View event details</p>
											</TooltipContent>
										</Tooltip>
									</div>
								</TableCell>
							)}
							{visibleColumns.labels && (
								<TableCell>
									<div className="flex gap-1 justify-end">
										{Object.entries(event.labels).map(([key, value]) => (
											<LabelBadge key={key} labelKey={key} labelValue={value} />
										))}
									</div>
								</TableCell>
							)}
							{visibleColumns.time && (
								<TableCell className="text-muted-foreground">
									{formatTimeAgo(event.eventDt)}
								</TableCell>
							)}
						</TableRow>
					))}

					{events.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={Object.keys(visibleColumns).length}
								className="text-center text-secondary-foreground text-sm py-6"
							>
								No timeline events found for the selected time window.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			{/* Timeline Event Sheet */}
			<TimelineEventSheet
				event={selectedEvent}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				key={selectedEvent?.id}
			/>

			{/* Pagination */}
			<SimplePagination
				currentPage={currentPage}
				totalPages={totalPages}
				onPreviousPage={handlePreviousPage}
				onNextPage={handleNextPage}
			/>
		</div>
	);
}
