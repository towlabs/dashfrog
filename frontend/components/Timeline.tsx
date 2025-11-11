"use client";

import { History, Sparkles, Tag } from "lucide-react";
import { useState } from "react";
import { LabelBadge } from "@/components/LabelBadge";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatTimeAgo } from "@/src/lib/formatters";
import type { TimelineEvent } from "@/src/types/timeline";

const ITEMS_PER_PAGE = 10;

type TimelineProps = {
	events: TimelineEvent[];
};

export function Timeline({ events }: TimelineProps) {
	const [currentPage, setCurrentPage] = useState(1);

	if (events.length === 0) {
		return (
			<div className="text-center text-muted-foreground py-12">
				No timeline events
			</div>
		);
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
		<div className="space-y-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-32">
							<div className="flex items-center gap-2">
								<History className="h-4 w-4" />
								Time
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center gap-2">
								<Sparkles className="h-4 w-4" />
								Event
							</div>
						</TableHead>
						<TableHead className="text-right">
							<div className="flex items-center gap-2 justify-end">
								<Tag className="h-4 w-4" />
								Labels
							</div>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{paginatedEvents.map((event, index) => (
						<TableRow key={startIndex + index}>
							<TableCell className="text-xs text-muted-foreground">
								{formatTimeAgo(event.eventDt)}
							</TableCell>
							<TableCell className="text-sm">
								<span className="mr-2 text-xl">{event.emoji}</span> {event.name}
							</TableCell>
							<TableCell>
								<div className="flex flex-wrap gap-1 justify-end">
									{Object.entries(event.labels).map(([key, value]) => (
										<LabelBadge key={key} labelKey={key} labelValue={value} />
									))}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-end">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									href="#"
									size="default"
									onClick={(e) => {
										e.preventDefault();
										handlePreviousPage();
									}}
									className={
										currentPage === 1
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>
							<PaginationItem>
								<div className="text-sm px-4">
									Page {currentPage} of {totalPages}
								</div>
							</PaginationItem>
							<PaginationItem>
								<PaginationNext
									href="#"
									size="default"
									onClick={(e) => {
										e.preventDefault();
										handleNextPage();
									}}
									className={
										currentPage === totalPages
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</div>
	);
}
