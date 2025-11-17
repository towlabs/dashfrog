"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { BarChart3 } from "lucide-react";
import { groupBy } from "lodash";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
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
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Flows } from "@/src/services/api/flows";
import { useNotebooksStore } from "@/src/stores/notebooks";
import { useTenantStore } from "@/src/stores/tenant";
import type { Flow, FlowHistory } from "@/src/types/flow";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { formatISO, addDays } from "date-fns";

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
	labelKey: string;
	dayDataMap: Map<string, DayData>;
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
		},
		content: "none",
	},
	{
		render: (props) => {
			const { tenant } = useParams<{ tenant: string }>();
			const tenantName = tenant ? decodeURIComponent(tenant) : "";
			const timeWindow = useTenantStore((state) => state.timeWindow);
			const filters = useTenantStore((state) => state.filters);
			const settingsOpenBlockId = useNotebooksStore(
				(state) => state.settingsOpenBlockId,
			);
			const closeBlockSettings = useNotebooksStore(
				(state) => state.closeBlockSettings,
			);
			const openBlockSettings = useNotebooksStore(
				(state) => state.openBlockSettings,
			);
			const flows = useNotebooksStore((state) => state.flows);
			const flowsLoading = useNotebooksStore((state) => state.flowsLoading);

			const [loading, setLoading] = useState(false);
			const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
			const [flowHistories, setFlowHistories] = useState<FlowHistory[]>([]);
			const [labelGroups, setLabelGroups] = useState<LabelGroupData[]>([]);
			const [comboboxOpen, setComboboxOpen] = useState(false);

			const flowName = props.block.props.flowName as string;

			// Update selected flow when flowName or available flows change
			useEffect(() => {
				if (!flowName || flows.length === 0) {
					setSelectedFlow(null);
					return;
				}

				const flow = flows.find((f) => f.name === flowName);
				setSelectedFlow(flow || null);
			}, [flowName, flows]);

			// Fetch flow histories when flow is selected
			useEffect(() => {
				if (!tenantName || !selectedFlow) {
					setFlowHistories([]);
					setLabelGroups([]);
					return;
				}

				const fetchFlowHistories = async () => {
					setLoading(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);
						const response = await Flows.getDetailedFlow(
							tenantName,
							selectedFlow.name,
							start,
							end,
							filters,
						);
						setFlowHistories(response.data.histories);
					} catch (error) {
						console.error("Failed to fetch flow histories:", error);
						setFlowHistories([]);
					} finally {
						setLoading(false);
					}
				};

				void fetchFlowHistories();
			}, [tenantName, selectedFlow, timeWindow, filters]);

			// Process flow histories into label groups
			useEffect(() => {
				// Group histories by label combinations using lodash
				const grouped = groupBy(flowHistories, (history: FlowHistory) =>
					JSON.stringify(history.labels, Object.keys(history.labels).sort()),
				);

				// Convert grouped data into LabelGroupData array
				const groups = Object.entries(grouped).map(([labelKey, histories]) => {
					const dayDataMap = new Map<string, DayData>();

					// Process each history in this label group
					for (const history of histories as FlowHistory[]) {
						const date = new Date(history.startTime);
						date.setHours(0, 0, 0, 0); // Reset to start of day
						const dateStr = date.toISOString().split("T")[0];

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
						labelKey,
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

			const isSettingsOpen = settingsOpenBlockId === props.block.id;

			const handleFlowSelect = (selectedFlowName: string) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						flowName: selectedFlowName,
					},
				});
			};

			// Get days to display (from start to end of time window)
			const { start, end } = resolveTimeWindow(timeWindow);
			let startDay = new Date(start);
			startDay.setHours(0, 0, 0, 0);
			const endDay = new Date(end);
			endDay.setHours(0, 0, 0, 0);
			const days: Date[] = [startDay];

			while (startDay < endDay) {
				startDay = addDays(startDay, 1);
				days.push(startDay);
			}

			// Render content based on state
			const renderContent = () => {
				if (!flowName) {
					return (
						<EmptyState
							icon={BarChart3}
							title="No flow selected"
							description="Select a flow to view its heatmap."
							onClick={() => openBlockSettings(props.block.id)}
							className="cursor-pointer"
						/>
					);
				}

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

				if (!selectedFlow) {
					return (
						<EmptyState
							icon={BarChart3}
							title="Flow not found"
							description="The selected flow could not be loaded."
						/>
					);
				}

				return (
					<div className="space-y-1">
						{/* Status Page Style Heatmap - Multiple Rows by Label */}
						<TooltipProvider>
							{labelGroups.map((labelGroup, index) => {
								return (
									<div key={labelGroup.labelKey} className="space-y-1">
										{/* Show flow name on first row */}
										{index === 0 && (
											<div className="text-sm font-medium mb-1">
												{selectedFlow.name}
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
									{flowsLoading ? (
										<div className="text-sm text-muted-foreground">
											Loading flows...
										</div>
									) : flows.length === 0 ? (
										<div className="text-sm text-muted-foreground">
											No flows available
										</div>
									) : (
										<Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={comboboxOpen}
													className="w-full justify-between"
												>
													{flowName
														? flows.find((f) => f.name === flowName)?.name
														: "Select a flow..."}
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[400px] p-0">
												<Command>
													<CommandInput placeholder="Search flows..." />
													<CommandList>
														<CommandEmpty>No flow found.</CommandEmpty>
														<CommandGroup>
															{flows.map((flow) => (
																<CommandItem
																	key={flow.name}
																	value={flow.name}
																	onSelect={(currentValue) => {
																		handleFlowSelect(
																			currentValue === flowName
																				? ""
																				: currentValue,
																		);
																		setComboboxOpen(false);
																	}}
																>
																	<Check
																		className={cn(
																			"mr-2 h-4 w-4",
																			flowName === flow.name
																				? "opacity-100"
																				: "opacity-0",
																		)}
																	/>
																	{flow.name}
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									)}
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</>
			);
		},
	},
)();
