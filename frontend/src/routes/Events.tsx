import { addDays, format } from "date-fns";
import {
	AlertCircle,
	AlertTriangle,
	CalendarIcon,
	ChevronDownIcon,
	ChevronLeft,
	ChevronRight,
	ClockArrowDown,
	ClockArrowUp,
	Info,
	Loader2,
	Plus,
	Shapes,
	TagIcon,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BlockNoteEditor } from "@blocknote/core";

import ClientBlockNote from "@/components/ClientBlockNote";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
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
import { blockNoteStorage } from "@/src/services/api/blocknote";
import { useEvents } from "@/src/contexts/events";
import { useLabels } from "@/src/contexts/labels";
import type { ApiFilter, Filter } from "@/src/types/filter";
import type { Event, EventKind } from "@/src/types/event";

interface StatusData {
	date: Date;
	status: string;
	dayOfWeek: number;
	hour: number;
	minute: number;
	isFuture: boolean;
	events: Event[];
}

// Map real events to calendar grid with 10-minute intervals
const generateStatusData = (startOfWeek: Date, realEvents: Event[]) => {
	const data: StatusData[] = [];
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

				const isFuture = date > now;

				// Find events that overlap this time slot
				const overlappingEvents = realEvents.filter((event) => {
					const eventStart = new Date(event.startedAt);
					const eventEnd = new Date(event.endedAt);
					return date >= eventStart && date < eventEnd;
				});

				// Determine status based on events
				let status = "operational";
				if (overlappingEvents.length > 0) {
					// If there are multiple events, prioritize incidents over maintenance
					const hasIncident = overlappingEvents.some((e) => e.kind === "incident");
					status = hasIncident ? "incident" : "maintenance";
				} else if (isFuture) {
					// No events and it's in the future
					status = "future";
				}
				// Past dates with no events remain "operational" (Ok status)
				// Future maintenance events will show as "maintenance" (blue) instead of "future" (gray)

				data.push({
					date,
					status,
					dayOfWeek: date.getDay(),
					hour,
					minute,
					isFuture,
					events: overlappingEvents,
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
	const { events: eventsStore, loading, error, refreshEvents, createEvent, updateEvent } = useEvents();
	const { labels: labelsStore } = useLabels();
	const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));
	const [filters, setFilters] = useState<Filter[]>([]);

	// Convert events store to array
	const eventsArray = useMemo(() => Object.values(eventsStore), [eventsStore]);

	const statusData = useMemo(() => generateStatusData(weekStart, eventsArray), [weekStart, eventsArray]);
	const [selectedDay, setSelectedDay] = useState<StatusData | null>(null);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingEventId, setEditingEventId] = useState<number | null>(null);
	const [eventTitle, setEventTitle] = useState("");
	const [eventStartDate, setEventStartDate] = useState<Date | undefined>();
	const [eventEndDate, setEventEndDate] = useState<Date | undefined>();
	const [eventStartTime, setEventStartTime] = useState("10:00");
	const [eventEndTime, setEventEndTime] = useState("11:00");
	const [eventType, setEventType] = useState<EventKind>("incident");
	const [eventLabels, setEventLabels] = useState<
		{ id: string; key: string; value: string }[]
	>([]);
	const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
	const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const editorRef = useRef<BlockNoteEditor | null>(null);

	// Alert dialog state
	const [alertDialog, setAlertDialog] = useState<{
		open: boolean;
		title: string;
		message: string;
		variant?: "error" | "warning" | "info";
	}>({
		open: false,
		title: "",
		message: "",
		variant: "error",
	});

	const showAlert = (
		title: string,
		message: string,
		variant: "error" | "warning" | "info" = "error",
	) => {
		setAlertDialog({ open: true, title, message, variant });
	};

	// Refresh events when filters change
	useEffect(() => {
		const apiFilters: ApiFilter[] = filters.map((f) => ({
			key: f.label,
			value: f.value,
			operator: f.operator,
			is_label: true, // Event filters are label-based
		}));
		void refreshEvents(apiFilters);
	}, [filters, refreshEvents]);

	const updateLabelKey = (labelId: string, newKey: string) => {
		// Update the key in state (validation happens on save)
		setEventLabels(
			eventLabels.map((l) => (l.id === labelId ? { ...l, key: newKey } : l)),
		);
	};

	const updateLabelValue = (labelId: string, newValue: string) => {
		// Update the value in state (validation happens on save)
		setEventLabels(
			eventLabels.map((l) =>
				l.id === labelId ? { ...l, value: newValue } : l,
			),
		);
	};

	const removeLabel = (labelId: string) => {
		setEventLabels(eventLabels.filter((l) => l.id !== labelId));
	};

	const addNewLabel = () => {
		const newLabel = {
			id: `label-${Date.now()}`,
			key: "",
			value: "",
		};
		setEventLabels([...eventLabels, newLabel]);
		setEditingLabelKey(newLabel.id);
	};

	const handleSaveEvent = async () => {
		if (!eventTitle || !eventStartDate || !eventEndDate) {
			showAlert(
				"Missing Required Fields",
				"Please fill in all required fields (title, start date, and end date).",
				"warning",
			);
			return;
		}

		try {
			setSaving(true);

			// Combine date and time
			const [startHour, startMin] = eventStartTime.split(":").map(Number);
			const [endHour, endMin] = eventEndTime.split(":").map(Number);

			const startDateTime = new Date(eventStartDate);
			startDateTime.setHours(startHour, startMin, 0, 0);

			const endDateTime = new Date(eventEndDate);
			endDateTime.setHours(endHour, endMin, 0, 0);

			// Validate: Incidents cannot be created for future times
			const now = new Date();
			if (eventType === "incident" && startDateTime > now) {
				showAlert(
					"Cannot Create Future Incident",
					"Incidents cannot be scheduled in the future. Please use 'Maintenance' type for planned events.",
					"error",
				);
				setSaving(false);
				return;
			}

			// Convert label array to Record (only include labels with both key and value)
			const labelsRecord: Record<string, string> = {};
			eventLabels.forEach((label) => {
				if (label.key.trim() && label.value.trim()) {
					labelsRecord[label.key.trim()] = label.value.trim();
				}
			});

			// Extract BlockNote content and convert to JSON string
			let descriptionJson: string | null = null;
			if (editorRef.current) {
				const editorContent = editorRef.current.document;
				// Only send description if there's actual content (not just empty paragraph)
				const hasContent = editorContent.length > 1 ||
					(editorContent.length === 1 &&
					 editorContent[0].type !== "paragraph" ||
					 (editorContent[0].content && editorContent[0].content.length > 0));

				if (hasContent) {
					descriptionJson = JSON.stringify(editorContent);
				}
			}

			const eventData = {
				title: eventTitle,
				description: descriptionJson,
				kind: eventType,
				labels: labelsRecord,
				startedAt: startDateTime.toISOString(),
				endedAt: endDateTime.toISOString(),
			};

			// Branch between update and create based on editing mode
			if (editingEventId !== null) {
				await updateEvent(editingEventId, eventData);
			} else {
				await createEvent(eventData);
			}

			// Clear BlockNote storage for this event
			const storageKey = editingEventId
				? `event-${editingEventId}`
				: `event-new-${selectedDay?.date.toISOString() || "new"}`;
			blockNoteStorage.clear(storageKey);

			// Close sheet and reset form
			setIsSheetOpen(false);
			setEventTitle("");
			setEventLabels([]);
			setEditingEventId(null);
		} catch (err) {
			const action = editingEventId !== null ? "update" : "create";
			console.error(`Failed to ${action} event:`, err);
			showAlert(
				`Failed to ${action === "update" ? "Update" : "Create"} Event`,
				`An error occurred while ${action === "update" ? "updating" : "creating"} the event. Please try again.`,
				"error",
			);
		} finally {
			setSaving(false);
		}
	};

	const handleDayClick = (day: StatusData) => {
		if (day.status === "incident" || day.status === "maintenance") {
			setSelectedDay(day);
			const firstEvent = day.events[0];

			// Set editing mode with event ID
			setEditingEventId(firstEvent?.id || null);
			setEventTitle(firstEvent?.title || "");

			// Parse start/end times from the event
			const eventStart = firstEvent ? new Date(firstEvent.startedAt) : new Date(day.date);
			const eventEnd = firstEvent ? new Date(firstEvent.endedAt) : new Date(day.date.getTime() + 60 * 60 * 1000);

			setEventStartDate(eventStart);
			setEventEndDate(eventEnd);
			setEventStartTime(eventStart.toTimeString().slice(0, 5));
			setEventEndTime(eventEnd.toTimeString().slice(0, 5));
			setEventType(firstEvent?.kind || (day.status === "maintenance" ? "maintenance" : "incident"));

			// Convert event labels to local format
			const labelsList = firstEvent?.labels
				? Object.entries(firstEvent.labels).map(([key, value]) => ({
						id: `label-${key}`,
						key,
						value,
					}))
				: [];
			setEventLabels(labelsList);
			setEditingLabelId(null);
			setEditingLabelKey(null);

			// Load event description into BlockNote storage
			if (firstEvent?.id) {
				if (firstEvent.description) {
					try {
						const descriptionContent = JSON.parse(firstEvent.description);
						blockNoteStorage.save(`event-${firstEvent.id}`, descriptionContent);
					} catch (e) {
						console.error("Failed to parse event description:", e);
						blockNoteStorage.clear(`event-${firstEvent.id}`);
					}
				} else {
					// Clear storage for events without description
					blockNoteStorage.clear(`event-${firstEvent.id}`);
				}
			}

			setIsSheetOpen(true);
		} else if (day.status === "operational" || day.status === "future") {
			// Open empty sheet for creating new event
			setSelectedDay(day);
			setEditingEventId(null);
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
			setEditingLabelKey(null);
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
								setEditingEventId(null);
								setEventTitle("");
								setEventStartDate(now);
								setEventEndDate(endTime);
								setEventStartTime(now.toTimeString().slice(0, 5));
								setEventEndTime(endTime.toTimeString().slice(0, 5));
								setEventType("incident");
								setEventLabels([]);
								setEditingLabelId(null);
								setEditingLabelKey(null);
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
						availableLabels={Object.keys(labelsStore).sort()}
						filters={filters}
						onFiltersChange={setFilters}
					/>

					{/* Events Timeline */}
					{loading ? (
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center justify-center py-12">
									<div className="flex items-center gap-2 text-muted-foreground">
										<Loader2 className="h-5 w-5 animate-spin" />
										<span>Loading events...</span>
									</div>
								</div>
							</CardContent>
						</Card>
					) : error ? (
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center justify-center py-12">
									<div className="text-center">
										<p className="text-red-500 mb-4">{error}</p>
										<Button onClick={() => refreshEvents()}>Try Again</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					) : (
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
					)}
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
													<Badge variant="outline" className="text-xs capitalize">
														{event.kind}
													</Badge>
												</div>
												<p className="text-sm text-muted-foreground">
													{event.description || "No description"}
												</p>
												{Object.keys(event.labels).length > 0 && (
													<div className="flex gap-1 flex-wrap mt-2">
														{Object.entries(event.labels).map(([key, value]) => (
															<Badge key={key} variant="secondary" className="text-xs">
																{key}: {value}
															</Badge>
														))}
													</div>
												)}
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
											<div className="space-y-2">
												{eventLabels.map((label) => (
													<div
														key={label.id}
														className="flex items-center gap-2"
													>
														{/* Key Input */}
														<Input
															value={label.key}
															onChange={(e) => updateLabelKey(label.id, e.target.value)}
															onBlur={(e) => {
																if (!e.target.value.trim()) {
																	removeLabel(label.id);
																}
															}}
															placeholder="key"
															className="w-32 h-8 text-sm"
															autoFocus={editingLabelKey === label.id}
														/>
														<span className="text-muted-foreground">:</span>
														{/* Value Input */}
														<Input
															value={label.value}
															onChange={(e) => updateLabelValue(label.id, e.target.value)}
															onBlur={(e) => {
																if (!e.target.value.trim() && !label.key.trim()) {
																	removeLabel(label.id);
																}
															}}
															placeholder="value"
															className="flex-1 h-8 text-sm"
															autoFocus={editingLabelId === label.id}
														/>
														{/* Remove Button */}
														<Button
															variant="ghost"
															size="sm"
															onClick={() => removeLabel(label.id)}
															className="h-8 w-8 p-0"
														>
															<X className="h-3 w-3" />
														</Button>
													</div>
												))}
												<Button
													variant="ghost"
													size="sm"
													onClick={addNewLabel}
													className="h-8 px-3 text-muted-foreground hover:text-foreground"
												>
													<Plus className="h-3 w-3 mr-1" />
													Add label
												</Button>
											</div>
										</div>
									</div>
								</div>

								{/* Separator */}
								<div className="my-6 border-t" />

								{/* Rich Text Editor */}
								<div className="min-h-[400px] mb-4">
									<div className="text-sm text-muted-foreground mb-2">Description</div>
									<ClientBlockNote
										timeWindow={{
											start: eventStartDate || new Date(),
											end: eventEndDate || new Date(),
										}}
										blockNoteId={editingEventId ? `event-${editingEventId}` : `event-new-${selectedDay?.date.toISOString() || "new"}`}
										onEditorReady={(editor) => {
											editorRef.current = editor;
										}}
									/>
								</div>

								{/* Save Button */}
								<div className="flex justify-end gap-2 pt-4 border-t">
									<Button
										variant="outline"
										onClick={() => setIsSheetOpen(false)}
										disabled={saving}
									>
										Cancel
									</Button>
									<Button onClick={handleSaveEvent} disabled={saving}>
										{saving ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												{editingEventId ? "Updating..." : "Saving..."}
											</>
										) : (
											editingEventId ? "Update Event" : "Save Event"
										)}
									</Button>
								</div>
							</div>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{/* Alert Dialog */}
			<Dialog
				open={alertDialog.open}
				onOpenChange={(open) =>
					setAlertDialog({ ...alertDialog, open })
				}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-3">
							{alertDialog.variant === "error" && (
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
									<AlertCircle className="h-5 w-5 text-red-600" />
								</div>
							)}
							{alertDialog.variant === "warning" && (
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
									<AlertTriangle className="h-5 w-5 text-yellow-600" />
								</div>
							)}
							{alertDialog.variant === "info" && (
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
									<Info className="h-5 w-5 text-blue-600" />
								</div>
							)}
							<span>{alertDialog.title}</span>
						</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<p className="text-sm text-muted-foreground">
							{alertDialog.message}
						</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							onClick={() =>
								setAlertDialog({ ...alertDialog, open: false })
							}
						>
							OK
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
