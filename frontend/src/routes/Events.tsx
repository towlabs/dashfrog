import { addDays, format } from "date-fns";
import {
	CalendarIcon,
	Check,
	ChevronDownIcon,
	ChevronLeft,
	ChevronRight,
	ClockArrowDown,
	ClockArrowUp,
	Plus,
	Shapes,
	TagIcon,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";

import ClientBlockNote from "@/components/ClientBlockNote";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Filter } from "@/src/types/filter";

interface StatusData {
	date: Date;
	status: string;
	dayOfWeek: number;
	hour: number;
	minute: number;
	isFuture: boolean;
	events: {
		title: string;
		description: string;
		severity: string;
		workflow: string;
		tenant: string;
	}[];
}

// Generate status data for 7 days with 10-minute intervals
const generateStatusData = (startOfWeek: Date) => {
	const data = [];
	const now = new Date();

	for (let day = 0; day < 7; day++) {
		for (let hour = 0; hour < 24; hour++) {
			for (let minute = 0; minute < 60; minute += 10) {
				const date = new Date(
					startOfWeek.getTime() +
						day * 24 * 60 * 60 * 1000 +
						hour * 60 * 60 * 1000 +
						minute * 60 * 1000,
				);
				let status = "operational";
				const hourOfDay = date.getHours();

				// Always check if this is a future time compared to current moment
				const isFuture = date > now;

				if (isFuture) {
					// Add planned maintenance for future times
					const dayOfWeek = date.getDay();
					if (
						(dayOfWeek === 6 || dayOfWeek === 0) &&
						hourOfDay >= 3 &&
						hourOfDay <= 5
					) {
						// Weekend maintenance windows
						status = "maintenance";
					} else {
						status = "future";
					}
				} else {
					// Add some realistic incident patterns for past times only using a seed for consistency
					const dayOfWeek = date.getDay();
					const timeKey = `${day}-${hour}-${minute}`; // Create consistent seed
					const seedValue = timeKey.split("").reduce((a, b) => {
						return a + b.charCodeAt(0);
					}, 0);
					const random = ((seedValue * 9301 + 49297) % 233280) / 233280; // Simple deterministic random

					// More incidents in the past
					if (random < 0.01) {
						// Higher chance for incidents
						status = "incident";
					} else if (
						(dayOfWeek === 1 || dayOfWeek === 3) &&
						hourOfDay >= 14 &&
						hourOfDay <= 16 &&
						random < 0.3
					) {
						status = "incident"; // Monday/Wednesday afternoon incidents
					} else if (
						dayOfWeek === 2 &&
						hourOfDay >= 9 &&
						hourOfDay <= 11 &&
						random < 0.4
					) {
						status = "incident"; // Tuesday morning incident
					} else if (
						(dayOfWeek === 0 || dayOfWeek === 6) &&
						hourOfDay >= 2 &&
						hourOfDay <= 4 &&
						random < 0.15
					) {
						status = "maintenance"; // Past weekend maintenance
					}
				}

				data.push({
					date,
					status,
					dayOfWeek: date.getDay(),
					hour: hourOfDay,
					minute,
					isFuture,
					events:
						status !== "operational" && status !== "future"
							? [
									{
										title:
											status === "incident"
												? "Service Incident"
												: "Scheduled Maintenance",
										description:
											status === "incident"
												? "Service disruption or outage"
												: "Planned system maintenance and updates",
										severity: status === "incident" ? "major" : "maintenance",
										workflow: "Platform Services",
										tenant: "all",
									},
								]
							: [],
				});
			}
		}
	}

	return data;
};

const statusColors = {
	operational: "bg-[#addf7d]",
	incident: "bg-[#e56458]",
	maintenance: "bg-[#2783de]",
	future: "bg-gray-200",
};

const statusLabels = {
	operational: "Normal",
	incident: "Incident",
	maintenance: "Planned Maintenance",
	future: "Future",
};

const getWeekStart = (date: Date) => {
	const start = new Date(date.getTime() - date.getDay() * 24 * 60 * 60 * 1000);
	start.setHours(0, 0, 0, 0);
	return start;
};

export default function EventsPage() {
	const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));
	const statusData = useMemo(() => generateStatusData(weekStart), [weekStart]);
	const [selectedDay, setSelectedDay] = useState<StatusData | null>(null);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [eventTitle, setEventTitle] = useState("");
	const [eventStartDate, setEventStartDate] = useState<Date | undefined>();
	const [eventEndDate, setEventEndDate] = useState<Date | undefined>();
	const [eventStartTime, setEventStartTime] = useState("10:00");
	const [eventEndTime, setEventEndTime] = useState("11:00");
	const [eventType, setEventType] = useState<"incident" | "maintenance">(
		"incident",
	);
	const [eventLabels, setEventLabels] = useState<
		{ id: string; key: string; value: string }[]
	>([]);
	const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
	const [filters, setFilters] = useState<Filter[]>([]);

	const getLabelOptions = (key: string): string[] => {
		switch (key) {
			case "environment":
				return ["production", "staging", "development", "test"];
			case "severity":
				return ["critical", "high", "medium", "low"];
			case "team":
				return ["backend", "frontend", "devops", "data", "mobile"];
			case "service":
				return ["api", "web", "database", "cache", "queue"];
			case "region":
				return ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"];
			default:
				return [];
		}
	};

	const updateLabelValue = (labelId: string, newValue: string) => {
		if (!newValue.trim()) {
			// Remove label if no value is set
			setEventLabels(eventLabels.filter((l) => l.id !== labelId));
		} else {
			setEventLabels(
				eventLabels.map((l) =>
					l.id === labelId ? { ...l, value: newValue } : l,
				),
			);
		}
		setEditingLabelId(null);
	};

	const handleDayClick = (day: StatusData) => {
		if (day.status === "incident" || day.status === "maintenance") {
			setSelectedDay(day);
			setEventTitle(day.events[0]?.title || "");
			setEventStartDate(new Date(day.date));
			setEventEndDate(new Date(day.date.getTime() + 60 * 60 * 1000)); // 1 hour later
			setEventStartTime(day.date.toTimeString().slice(0, 5)); // HH:MM format
			setEventEndTime(
				new Date(day.date.getTime() + 60 * 60 * 1000)
					.toTimeString()
					.slice(0, 5),
			);
			setEventType(day.status === "maintenance" ? "maintenance" : "incident");
			setEventLabels([]);
			setEditingLabelId(null);
			setIsSheetOpen(true);
		} else if (day.status === "operational" || day.status === "future") {
			// Open empty sheet for creating new event
			setSelectedDay(day);
			setEventTitle("");
			setEventStartDate(new Date(day.date));
			setEventEndDate(new Date(day.date.getTime() + 60 * 60 * 1000)); // 1 hour later
			setEventStartTime(day.date.toTimeString().slice(0, 5)); // HH:MM format
			setEventEndTime(
				new Date(day.date.getTime() + 60 * 60 * 1000)
					.toTimeString()
					.slice(0, 5),
			);
			setEventType("incident");
			setEventLabels([]);
			setEditingLabelId(null);
			setIsSheetOpen(true);
		} else {
			setSelectedDay(day);
			setIsDetailDialogOpen(true);
		}
	};

	return (
		<div className="w-full p-8 pt-6">
			<div className="space-y-8">
				{/* Header */}
				<div className="flex items-center justify-between space-y-2">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
						<p className="text-muted-foreground">
							Track incidents and planned maintenance across time
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setWeekStart(addDays(weekStart, -7))}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="min-w-[220px] justify-start"
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{format(weekStart, "MMM d")} –{" "}
									{format(addDays(weekStart, 6), "MMM d, yyyy")}
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" className="p-0">
								<Calendar
									mode="single"
									selected={weekStart}
									onSelect={(d) => d && setWeekStart(getWeekStart(d))}
								/>
							</PopoverContent>
						</Popover>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setWeekStart(addDays(weekStart, 7))}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setWeekStart(getWeekStart(new Date()))}
						>
							This week
						</Button>
						<Button
							onClick={() => {
								const now = new Date();
								const endTime = new Date(now.getTime() + 60 * 60 * 1000);
								setEventTitle("");
								setEventStartDate(now);
								setEventEndDate(endTime);
								setEventStartTime(now.toTimeString().slice(0, 5));
								setEventEndTime(endTime.toTimeString().slice(0, 5));
								setEventType("incident");
								setEventLabels([]);
								setEditingLabelId(null);
								setIsSheetOpen(true);
							}}
							size="sm"
						>
							Create Event
						</Button>
					</div>
				</div>

				<div className="space-y-4">
					{/* Filters */}
					<FilterBadgesEditor
						availableLabels={["type", "status", "title"]}
						filters={filters}
						onFiltersChange={setFilters}
					/>

					{/* Events Timeline */}

					<Card>
						<CardContent className="pt-6">
							<div className="space-y-3">
								{/* Legend */}
								<div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
									<div className="flex items-center space-x-4">
										<div className="flex items-center space-x-1">
											<div
												className="w-3 h-3 rounded-sm"
												style={{ backgroundColor: "#addf7d" }}
											></div>
											<span>Normal</span>
										</div>
										<div className="flex items-center space-x-1">
											<div
												className="w-3 h-3 rounded-sm"
												style={{ backgroundColor: "#e56458" }}
											></div>
											<span>Incident</span>
										</div>
										<div className="flex items-center space-x-1">
											<div
												className="w-3 h-3 rounded-sm"
												style={{ backgroundColor: "#2783de" }}
											></div>
											<span>Planned Maintenance</span>
										</div>
									</div>
								</div>

								{/* Hour markers */}
								<div className="flex gap-0.5 w-full mb-2">
									<div className="w-20 flex-shrink-0"></div>{" "}
									{/* Space for day labels */}
									{Array.from({ length: 24 }, (_, hour) => (
										<div key={hour} className="flex gap-0.5">
											{Array.from({ length: 6 }, (_, interval) => (
												<div
													key={interval}
													className="flex-1"
													style={{ minWidth: "2px" }}
												>
													{interval === 0 && (
														<span className="text-xs text-muted-foreground">
															{hour.toString().padStart(2, "0")}
														</span>
													)}
												</div>
											))}
										</div>
									))}
								</div>

								{/* Status bars - one row per day of week */}
								{[
									"Sunday",
									"Monday",
									"Tuesday",
									"Wednesday",
									"Thursday",
									"Friday",
									"Saturday",
								].map((dayName, dayIndex) => (
									<div key={dayName} className="flex items-center gap-2">
										<div className="w-20 flex-shrink-0 text-xs text-muted-foreground font-medium">
											{dayName}
										</div>
										<div className="flex gap-0.5 w-full">
											{statusData
												.filter((day) => day.date.getDay() === dayIndex)
												.map((day, index) => (
													<div
														key={index}
														className={`h-8 flex-1 rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${
															statusColors[
																day.status as keyof typeof statusColors
															]
														}`}
														onClick={() => handleDayClick(day)}
														style={{ minWidth: "2px" }}
													/>
												))}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Day Details Dialog */}
			<Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					{/* Fallback title to satisfy Radix a11y when content is empty */}
					<DialogTitle className="sr-only">Day details</DialogTitle>
					{selectedDay && (
						<>
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2">
									<div
										className={`w-3 h-3 rounded-full ${
											statusColors[
												selectedDay.status as keyof typeof statusColors
											]
										}`}
									/>
									{selectedDay.date.toLocaleDateString("en-US", {
										weekday: "long",
										month: "long",
										day: "numeric",
										year: "numeric",
									})}
								</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<h4 className="font-medium text-sm">Status</h4>
										<Badge
											className={`text-xs ${
												selectedDay.status === "operational"
													? "bg-green-100 text-green-800 border-green-200"
													: selectedDay.status === "degraded"
														? "bg-yellow-100 text-yellow-800 border-yellow-200"
														: selectedDay.status === "incident"
															? "bg-red-100 text-red-800 border-red-200"
															: "bg-blue-100 text-blue-800 border-blue-200"
											}`}
											variant="outline"
										>
											{
												statusLabels[
													selectedDay.status as keyof typeof statusLabels
												]
											}
										</Badge>
									</div>
								</div>

								{selectedDay.events.length > 0 && (
									<div>
										<h4 className="font-medium text-sm mb-2">Events</h4>
										{selectedDay.events.map((event, index) => (
											<div
												key={index}
												className="space-y-2 p-3 rounded-lg border"
											>
												<div className="flex justify-between items-start">
													<h5 className="font-medium text-sm">{event.title}</h5>
													<Badge variant="outline" className="text-xs">
														{event.severity}
													</Badge>
												</div>
												<p className="text-sm text-muted-foreground">
													{event.description}
												</p>
											</div>
										))}
									</div>
								)}

								{selectedDay.status === "operational" && (
									<div className="p-3 rounded-lg bg-green-50 border border-green-200">
										<p className="text-sm text-green-800">
											All systems operated normally throughout this day.
										</p>
									</div>
								)}
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Event Details Sheet */}
			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent className="w-[1000px] sm:max-w-none p-0 overflow-auto">
					{/* Fallback title to satisfy Radix a11y */}
					<SheetTitle className="sr-only">Event details</SheetTitle>
					<div className="flex flex-col h-full w-full">
						{/* Diagonal striped header */}
						<div
							className="h-24 w-full relative overflow-hidden"
							style={{
								background:
									eventType === "incident"
										? `repeating-linear-gradient(
                      45deg,
                      #f9dcd9,
                      #f9dcd9 10px,
                      #fde8e6 10px,
                      #fde8e6 20px
                    )`
										: `repeating-linear-gradient(
                      45deg,
                      #d8e4f1,
                      #d8e4f1 10px,
                      #e5edf6 10px,
                      #e5edf6 20px
                    )`,
							}}
						>
							<div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/40" />
						</div>

						{/* Main content area */}
						<div className="flex-1 overflow-auto -mt-12 relative z-10">
							<div className="w-full py-8 pr-6 pl-12 bg-white">
								{/* Large borderless title input */}
								<div className="mb-8">
									<input
										value={eventTitle}
										onChange={(e) => setEventTitle(e.target.value)}
										className="w-full text-4xl font-bold border-none outline-none bg-transparent placeholder-gray-400 resize-none"
										placeholder="Untitled"
										style={{ lineHeight: "1.2" }}
									/>
								</div>

								{/* Properties - Notion-style */}
								<div className="mb-8 space-y-3">
									{/* Start Time */}
									<div className="flex items-center gap-4">
										<div className="w-36 text-sm text-muted-foreground flex items-center gap-2">
											<ClockArrowUp className="h-4 w-4" />
											Start Time
										</div>
										<div className="flex-1 flex gap-2">
											<Popover>
												<PopoverTrigger asChild>
													<Button
														variant="outline"
														className="w-32 justify-between font-normal"
													>
														{eventStartDate
															? eventStartDate.toLocaleDateString()
															: "Select date"}
														<ChevronDownIcon className="h-4 w-4" />
													</Button>
												</PopoverTrigger>
												<PopoverContent
													className="w-auto overflow-hidden p-0"
													align="start"
												>
													<Calendar
														mode="single"
														selected={eventStartDate}
														captionLayout="dropdown"
														onSelect={setEventStartDate}
													/>
												</PopoverContent>
											</Popover>
											<Input
												type="time"
												value={eventStartTime}
												onChange={(e) => setEventStartTime(e.target.value)}
												className="w-24 bg-background"
											/>
										</div>
									</div>

									{/* End Time */}
									<div className="flex items-center gap-4">
										<div className="w-36 text-sm text-muted-foreground flex items-center gap-2">
											<ClockArrowDown className="h-4 w-4" />
											End Time
										</div>
										<div className="flex-1 flex gap-2">
											<Popover>
												<PopoverTrigger asChild>
													<Button
														variant="outline"
														className="w-32 justify-between font-normal"
													>
														{eventEndDate
															? eventEndDate.toLocaleDateString()
															: "Select date"}
														<ChevronDownIcon className="h-4 w-4" />
													</Button>
												</PopoverTrigger>
												<PopoverContent
													className="w-auto overflow-hidden p-0"
													align="start"
												>
													<Calendar
														mode="single"
														selected={eventEndDate}
														captionLayout="dropdown"
														onSelect={setEventEndDate}
													/>
												</PopoverContent>
											</Popover>
											<Input
												type="time"
												value={eventEndTime}
												onChange={(e) => setEventEndTime(e.target.value)}
												className="w-24 bg-background"
											/>
										</div>
									</div>

									{/* Type */}
									<div className="flex items-center gap-4">
										<div className="w-36 text-sm text-muted-foreground flex items-center gap-2">
											<Shapes className="h-4 w-4" />
											Type
										</div>
										<div className="flex-1">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														className="justify-start text-left font-normal px-2 py-1 h-auto hover:bg-gray-100 rounded"
													>
														{eventType === "incident" ? (
															<div
																className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
																style={{
																	backgroundColor: "#f9dcd9",
																	color: "#6d3531",
																}}
															>
																<span
																	className="w-2 h-2 rounded-full mr-1.5"
																	style={{ backgroundColor: "#e56458" }}
																/>
																Incident
															</div>
														) : (
															<div
																className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
																style={{
																	backgroundColor: "#d8e4f1",
																	color: "#264a72",
																}}
															>
																<span
																	className="w-2 h-2 rounded-full mr-1.5"
																	style={{ backgroundColor: "#2783de" }}
																/>
																Maintenance
															</div>
														)}
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align="start"
													className="w-[180px]"
												>
													<DropdownMenuItem
														onClick={() => setEventType("incident")}
														className="cursor-pointer"
													>
														<div
															className="w-full inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
															style={{
																backgroundColor: "#f9dcd9",
																color: "#6d3531",
															}}
														>
															<span
																className="w-2 h-2 rounded-full mr-1.5"
																style={{ backgroundColor: "#e56458" }}
															/>
															Incident
														</div>
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => setEventType("maintenance")}
														className="cursor-pointer"
													>
														<div
															className="w-full inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
															style={{
																backgroundColor: "#d8e4f1",
																color: "#264a72",
															}}
														>
															<span
																className="w-2 h-2 rounded-full mr-1.5"
																style={{ backgroundColor: "#2783de" }}
															/>
															Maintenance
														</div>
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>

									{/* Labels */}
									<div className="flex items-start gap-4">
										<div className="w-36 text-sm text-muted-foreground flex items-center gap-2">
											<TagIcon className="h-4 w-4" />
											Labels
										</div>
										<div className="flex-1">
											<div className="flex gap-2 flex-wrap items-center">
												{eventLabels.map((label) => (
													<div
														key={label.id}
														className="inline-flex items-center"
													>
														{editingLabelId === label.id ? (
															<Popover
																open={true}
																onOpenChange={(open) =>
																	!open &&
																	updateLabelValue(label.id, label.value)
																}
															>
																<PopoverTrigger asChild>
																	<div className="inline-flex items-center gap-0.5 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
																		<span className="text-muted-foreground">
																			{label.key}
																		</span>
																		<span className="mx-0.5 text-foreground">
																			:
																		</span>
																		<span className="font-medium text-foreground">
																			{label.value}
																		</span>
																	</div>
																</PopoverTrigger>
																<PopoverContent
																	className="w-48 p-0"
																	align="start"
																>
																	<Command>
																		<CommandInput
																			placeholder={`Search ${label.key} values...`}
																		/>
																		<CommandList>
																			<CommandEmpty>
																				No options found.
																			</CommandEmpty>
																			<CommandGroup>
																				{getLabelOptions(label.key).map(
																					(option) => (
																						<CommandItem
																							key={option}
																							value={option}
																							onSelect={() =>
																								updateLabelValue(
																									label.id,
																									option,
																								)
																							}
																						>
																							<Check
																								className={cn(
																									"mr-2 h-4 w-4",
																									label.value === option
																										? "opacity-100"
																										: "opacity-0",
																								)}
																							/>
																							{option}
																						</CommandItem>
																					),
																				)}
																			</CommandGroup>
																		</CommandList>
																	</Command>
																</PopoverContent>
															</Popover>
														) : (
															<div
																className="inline-flex items-center gap-0.5 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs cursor-pointer hover:bg-secondary/80"
																onClick={() => setEditingLabelId(label.id)}
															>
																<span className="text-muted-foreground">
																	{label.key}
																</span>
																<span className="mx-0.5 text-foreground">
																	:
																</span>
																<span className="font-medium text-foreground">
																	{label.value}
																</span>
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={(e) => {
																		e.stopPropagation();
																		setEventLabels(
																			eventLabels.filter(
																				(l) => l.id !== label.id,
																			),
																		);
																	}}
																	className="ml-0.5 h-3 w-3 p-0 hover:bg-muted/50 rounded-full"
																>
																	<X className="h-2 w-2" />
																</Button>
															</div>
														)}
													</div>
												))}
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="sm"
															className="h-6 px-2 text-muted-foreground hover:text-foreground"
														>
															<Plus className="h-3 w-3 mr-1" />
															Add label
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="start" className="w-48">
														{[
															"environment",
															"severity",
															"team",
															"service",
															"region",
														].map((labelKey) => (
															<DropdownMenuItem
																key={labelKey}
																onClick={() => {
																	if (
																		!eventLabels.find((l) => l.key === labelKey)
																	) {
																		const newLabel = {
																			id: `label-${Date.now()}`,
																			key: labelKey,
																			value: "", // Start with empty value
																		};
																		setEventLabels([...eventLabels, newLabel]);
																		// Auto-open combobox for new label
																		setTimeout(
																			() => setEditingLabelId(newLabel.id),
																			100,
																		);
																	}
																}}
																className="text-sm capitalize"
															>
																{labelKey}
															</DropdownMenuItem>
														))}
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</div>
									</div>
								</div>

								{/* Separator */}
								<div className="my-6 border-t" />

								{/* Rich Text Editor */}
								<div className="min-h-[400px]">
									<ClientBlockNote
										timeWindow={{
											start: eventStartDate || new Date(),
											end: eventEndDate || new Date(),
										}}
										blockNoteId="wip"
									/>
								</div>
							</div>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
