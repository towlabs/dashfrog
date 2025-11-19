"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { addDays, formatISO } from "date-fns";
import { groupBy } from "lodash";
import { BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { FlowDetail } from "@/components/FlowDetail";
import { FlowSelector } from "@/components/FlowSelector";
import { LabelBadge } from "@/components/LabelBadge";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flows } from "@/src/services/api/flows";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import type { Flow, FlowHistory } from "@/src/types/flow";
import { resolveTimeWindow, TimeWindow } from "@/src/types/timewindow";

interface DayData {
	date: Date;
	dateStr: string;
	totalRuns: number;
	successCount: number;
	failureCount: number;
	runningCount: number;
}

interface LabelGroupData {
	labels: Record<string, string>;
	dayDataMap: Map<string, DayData>;
	groupId: string;
}

function getBarColor(dayData: DayData | null): string {
	if (!dayData || dayData.totalRuns === 0) {
		return "var(--color-secondary)";
	}

	const allSuccess = dayData.failureCount === 0 && dayData.runningCount === 0;
	const allFailure = dayData.successCount === 0 && dayData.runningCount === 0;
	const someRunning = dayData.runningCount > 0;

	if (allFailure) {
		return "#e56458"; // Red - all flows failing
	}
	if (allSuccess) {
		return "#5cb660"; // Green - all successful
	}
	if (someRunning) {
		return "#2883df"; // Blue - some running
	}
	// Some failures but not all
	return "orange";
}

export const HeatmapBlock = createReactBlockSpec(
	{
		type: "heatmap" as const,
		propSchema: {
			flowName: {
				default: "",
			},
			blockFilters: {
				default: "[]",
			},
		},
		content: "none",
	},
	{
		render: (props) => {
			const { tenant } = useParams<{ tenant: string }>();
			const tenantName = tenant ? decodeURIComponent(tenant) : "";
			const timeWindow = useNotebooksStore(
				(state) => state.currentNotebook?.timeWindow,
			);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const settingsOpenBlockId = useNotebooksStore(
				(state) => state.settingsOpenBlockId,
			);
			const closeBlockSettings = useNotebooksStore(
				(state) => state.closeBlockSettings,
			);

			const flows = useNotebooksStore((state) => state.flows);
			const flowsLoading = useNotebooksStore((state) => state.flowsLoading);
			const labels = useLabelsStore((state) => state.labels);

			const [loading, setLoading] = useState(false);

			const [flowHistories, setFlowHistories] = useState<FlowHistory[]>([]);
			const [labelGroups, setLabelGroups] = useState<LabelGroupData[]>([]);
			const [detailOpen, setDetailOpen] = useState(false);
			const [selectedLabels, setSelectedLabels] = useState<
				Record<string, string>
			>({});
			const [selectedDay, setSelectedDay] = useState<Date | null>(null);

			const flowName = props.block.props.flowName as string;

			// Parse block filters from JSON string
			const blockFilters: Filter[] = useMemo(() => {
				try {
					return JSON.parse(props.block.props.blockFilters as string);
				} catch {
					return [];
				}
			}, [props.block.props.blockFilters]);

			// Merge notebook filters with block filters
			const filters = useMemo(
				() => [...(notebookFilters || []), ...blockFilters],
				[notebookFilters, blockFilters],
			);

			const selectedTimeWindow: TimeWindow | null = useMemo(() => {
				if (!selectedDay) return null;
				const start = new Date(selectedDay);
				const end = new Date(selectedDay);
				start.setHours(0, 0, 0, 0);
				end.setHours(23, 59, 59, 999);
				return { type: "absolute", metadata: { start, end } };
			}, [selectedDay]);

			// Fetch flow histories when flow is selected
			useEffect(() => {
				if (
					!tenantName ||
					!flowName ||
					timeWindow === undefined ||
					filters === undefined
				) {
					setFlowHistories([]);
					setLabelGroups([]);
					return;
				}

				const fetchFlowHistories = async () => {
					setLoading(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);
						const response = await Flows.getFlowHistory(
							tenantName,
							flowName,
							start,
							end,
							filters,
						);
						setFlowHistories(response);
					} catch (error) {
						console.error("Failed to fetch flow histories:", error);
						setFlowHistories([]);
					} finally {
						setLoading(false);
					}
				};

				void fetchFlowHistories();
			}, [tenantName, flowName, timeWindow, filters]);

			// Process flow histories into label groups
			useEffect(() => {
				// Group histories by label combinations using lodash
				const grouped = groupBy(
					flowHistories,
					(history: FlowHistory) => history.groupId,
				);

				// Convert grouped data into LabelGroupData array
				const groups = Object.entries(grouped).map(([groupId, histories]) => {
					const dayDataMap = new Map<string, DayData>();

					// Process each history in this label group
					for (const history of histories as FlowHistory[]) {
						const date = history.startTime;
						const dateStr = formatISO(date, {
							representation: "date",
						});

						const existing = dayDataMap.get(dateStr);
						if (existing) {
							existing.totalRuns++;
							if (history.status === "success") existing.successCount++;
							if (history.status === "failure") existing.failureCount++;
							if (history.status === "running") existing.runningCount++;
						} else {
							dayDataMap.set(dateStr, {
								date,
								dateStr,
								totalRuns: 1,
								successCount: history.status === "success" ? 1 : 0,
								failureCount: history.status === "failure" ? 1 : 0,
								runningCount: history.status === "running" ? 1 : 0,
							});
						}
					}

					return {
						labels: (histories as FlowHistory[])[0].labels,
						groupId: groupId,
						dayDataMap,
					};
				});

				setLabelGroups(groups);
			}, [flowHistories]);

			if (!tenantName) {
				return (
					<div className="p-4 border rounded-lg">
						<div className="text-sm text-muted-foreground">
							No tenant selected
						</div>
					</div>
				);
			}

			if (timeWindow === undefined) {
				return (
					<div className="p-4 border rounded-lg">
						<div className="text-sm text-muted-foreground"></div>
					</div>
				);
			}

			const isSettingsOpen = settingsOpenBlockId === props.block.id;

			const handleDayClick = (labels: Record<string, string>, day: Date) => {
				setSelectedLabels(labels);
				setSelectedDay(day);
				setDetailOpen(true);
			};

			const handleFlowSelect = (selectedFlowName: string) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						flowName: selectedFlowName,
					},
				});
			};

			const handleFiltersChange = (newFilters: Filter[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						blockFilters: JSON.stringify(newFilters),
					},
				});
			};

			// Get days to display (from start to end of time window)
			const { start, end } = resolveTimeWindow(timeWindow);
			let startDay = start;
			const days: Date[] = [startDay];

			while (startDay < end) {
				startDay = addDays(startDay, 1);
				days.push(startDay);
			}

			// Render content based on state
			const renderContent = () => {
				if (loading) {
					return (
						<div className="space-y-2">
							<div className="h-5 w-32 bg-muted rounded animate-pulse" />
							<div className="flex gap-[2px]">
								{Array.from({ length: 30 }).map((_, i) => (
									<div
										key={i}
										className="w-3 h-8 bg-muted rounded-sm animate-pulse"
										style={{
											animationDelay: `${i * 20}ms`,
										}}
									/>
								))}
							</div>
						</div>
					);
				}

				return (
					<div className="space-y-1">
						{/* Status Page Style Heatmap - Multiple Rows by Label */}
						<TooltipProvider>
							{labelGroups.map((labelGroup, index) => {
								return (
									<div key={labelGroup.groupId} className="space-y-1">
										{/* Show flow name on first row */}
										{index === 0 && (
											<div className="text-m font-medium mb-1">
												{flowName || "N/A"}
											</div>
										)}
										<div className="flex items-center gap-2">
											<div className="flex gap-[2px] flex-1">
												{days.map((day) => {
													const dateStr = formatISO(day, {
														representation: "date",
													});
													const dayData =
														labelGroup.dayDataMap.get(dateStr) || null;
													const color = getBarColor(dayData);

													return (
														<Tooltip key={dateStr} delayDuration={0}>
															<TooltipTrigger asChild>
																<div
																	className="w-3 h-8 rounded-sm transition-opacity hover:opacity-80 cursor-pointer"
																	style={{ backgroundColor: color }}
																	onClick={() =>
																		handleDayClick(labelGroup.labels, day)
																	}
																/>
															</TooltipTrigger>
															<TooltipContent>
																<div className="text-xs">
																	<div className="font-semibold mb-1">
																		{dateStr}
																	</div>

																	{dayData ? (
																		<div className="flex items-center gap-3">
																			<div className="flex items-center gap-1">
																				<div
																					className="w-2 h-2 rounded-full"
																					style={{ backgroundColor: "#5cb660" }}
																				/>
																				<span>{dayData.successCount}</span>
																			</div>
																			{dayData.failureCount > 0 && (
																				<div className="flex items-center gap-1">
																					<div
																						className="w-2 h-2 rounded-full"
																						style={{
																							backgroundColor: "#e56458",
																						}}
																					/>
																					<span>{dayData.failureCount}</span>
																				</div>
																			)}
																			{dayData.runningCount > 0 && (
																				<div className="flex items-center gap-1">
																					<div
																						className="w-2 h-2 rounded-full"
																						style={{
																							backgroundColor: "#2883df",
																						}}
																					/>
																					<span>{dayData.runningCount}</span>
																				</div>
																			)}
																		</div>
																	) : (
																		<div className="text-muted-foreground">
																			No runs
																		</div>
																	)}
																</div>
															</TooltipContent>
														</Tooltip>
													);
												})}
											</div>
											<div className="flex items-center gap-1">
												{Object.entries(labelGroup.labels).map(
													([key, value]) => (
														<LabelBadge
															key={key}
															labelKey={key}
															labelValue={value}
															readonly
														/>
													),
												)}
											</div>
										</div>
									</div>
								);
							})}
							{labelGroups.length === 0 && (
								<div className="space-y-1">
									{/* Show flow name on first row */}
									<div className="text-m font-medium mb-1">
										{flowName || "N/A"}
									</div>
									<div className="flex items-center gap-2">
										<div className="flex gap-[2px] flex-1">
											{days.map((day) => {
												const dateStr = formatISO(day, {
													representation: "date",
												});

												return (
													<Tooltip key={dateStr} delayDuration={0}>
														<TooltipTrigger asChild>
															<div
																className="w-3 h-8 rounded-sm transition-opacity hover:opacity-80 cursor-pointer"
																style={{
																	backgroundColor: "var(--color-secondary)",
																}}
															/>
														</TooltipTrigger>
														<TooltipContent>
															<div className="text-xs">
																<div className="font-semibold mb-1">
																	{dateStr}
																</div>

																<div className="text-muted-foreground">
																	No runs
																</div>
															</div>
														</TooltipContent>
													</Tooltip>
												);
											})}
										</div>
									</div>
								</div>
							)}
						</TooltipProvider>
					</div>
				);
			};

			return (
				<>
					<div className="outline-none min-w-0 flex-1">{renderContent()}</div>

					<Sheet
						open={isSettingsOpen}
						onOpenChange={(open) => {
							if (!open) closeBlockSettings();
						}}
					>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Heatmap Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								<div className="space-y-3">
									<Label className="text-sm font-medium">Flow</Label>
									<FlowSelector
										flows={flows}
										flowsLoading={flowsLoading}
										selectedFlowName={flowName}
										onFlowSelect={handleFlowSelect}
									/>
								</div>

								<div className="space-y-3 mt-6">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Additional Filters
									</h3>
									<FilterBadgesEditor
										availableLabels={labels}
										filters={blockFilters}
										onFiltersChange={handleFiltersChange}
									/>
								</div>
							</div>
						</SheetContent>
					</Sheet>

					{/* Flow Detail Sheet */}
					{selectedTimeWindow && (
						<FlowDetail
							labels={selectedLabels}
							flowName={flowName}
							open={detailOpen}
							timeWindow={selectedTimeWindow}
							onOpenChange={setDetailOpen}
						/>
					)}
				</>
			);
		},
	},
)();
