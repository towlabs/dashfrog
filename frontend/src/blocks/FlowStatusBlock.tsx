"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
	Check,
	CheckCircle2,
	ChevronsUpDown,
	CircleCheck,
	RectangleEllipsis,
	Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FlowStatus } from "@/components/FlowStatus";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatTimeAgo } from "@/src/lib/formatters";
import { Flows, toFlow } from "@/src/services/api/flows";
import { useNotebooksStore } from "@/src/stores/notebooks";
import { useTenantStore } from "@/src/stores/tenant";
import type { Flow, FlowHistory } from "@/src/types/flow";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { cn } from "@/lib/utils";
import { LabelBadge } from "@/components/LabelBadge";

const flowStatusColors = {
	success: "bg-green-700",
	failure: "bg-red-700",
	running: "bg-blue-700",
};

export const FlowStatusBlock = createReactBlockSpec(
	{
		type: "flowStatus" as const,
		propSchema: {
			flowName: {
				default: "",
			},
			title: {
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
			const flows = useNotebooksStore((state) => state.flows);
			const flowsLoading = useNotebooksStore((state) => state.flowsLoading);

			const [flowHistories, setFlowHistories] = useState<FlowHistory[]>([]);
			const [loadingHistory, setLoadingHistory] = useState(false);
			const [comboboxOpen, setComboboxOpen] = useState(false);

			const flowName = props.block.props.flowName as string;
			const title = props.block.props.title as string;

			// Fetch selected flow details when flowName is set
			useEffect(() => {
				const fetchFlowHistory = async () => {
					if (!tenantName || !flowName) {
						setFlowHistories([]);
						return;
					}

					setLoadingHistory(true);
					const { start, end } = resolveTimeWindow(timeWindow);
					const flowHistories = await Flows.getLastFlow(
						tenantName,
						flowName,
						start,
						end,
						filters,
					);
					setFlowHistories(flowHistories);
					setLoadingHistory(false);
				};

				void fetchFlowHistory();
			}, [tenantName, flowName, timeWindow, filters]);

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

			// Render content based on state
			const renderContent = () => {
				if (!flowName) {
					return (
						<EmptyState
							icon={RectangleEllipsis}
							title="No flow selected"
							description="Select a flow to view its status."
						/>
					);
				}

				if (loadingHistory) {
					return (
						<Card className="@container/card shadow-none">
							<CardHeader>
								<Skeleton className="h-4 w-64" />
							</CardHeader>
							<CardContent className="space-y-4">
								<Skeleton className="h-4 w-48" />
							</CardContent>
						</Card>
					);
				}

				if (flowHistories.length === 0) {
					return (
						<EmptyState
							icon={RectangleEllipsis}
							title="Flow not found"
							description="No flow found for the selected time window."
						/>
					);
				}

				return (
					<div className="outline-none flex flex-col gap-1">
						{flowHistories.map((flowHistory) => renderFlowHistory(flowHistory))}
					</div>
				);
			};

			const renderFlowHistory = (flowHistory: FlowHistory) => {
				return (
					<Card className="@container/card shadow-none">
						<CardHeader>
							<CardDescription className="text-xl font-semibold flex items-baseline gap-2">
								<div
									className={cn(
										"w-2.5 h-2.5 rounded-full",
										flowStatusColors[flowHistory.status],
									)}
								/>
								{title || flowName}
							</CardDescription>
							<CardTitle className="text-secondary-foreground text-sm font-normal">
								Duration:{" "}
								{formatDuration(flowHistory.startTime, flowHistory.endTime)}
								{flowHistory.endTime && (
									<> - {formatTimeAgo(flowHistory.endTime)}</>
								)}
							</CardTitle>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm p-3 pt-0">
							<div className="flex gap-1">
								{Object.entries(flowHistory.labels).map(([key, value]) => (
									<div key={key}>
										<LabelBadge labelKey={key} labelValue={value} readonly />
									</div>
								))}
							</div>
						</CardFooter>
					</Card>
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
								<SheetTitle>Flow Status Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								<div className="space-y-3">
									<Label className="text-sm font-medium">Title</Label>
									<Input
										placeholder="Optional title..."
										value={title}
										onChange={(e) => {
											props.editor.updateBlock(props.block, {
												props: {
													...props.block.props,
													title: e.target.value,
												},
											});
										}}
									/>
								</div>

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
														? flows.find((flow) => flow.name === flowName)?.name
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
