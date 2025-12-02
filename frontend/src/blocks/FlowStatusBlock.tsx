"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ChartNoAxesGantt, Circle } from "lucide-react";
import React from "react";
import { useParams } from "react-router-dom";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { FlowDetail } from "@/components/FlowDetail";
import { FlowSelector } from "@/components/FlowSelector";
import { statusConfig } from "@/components/FlowStatus";
import { LabelBadge } from "@/components/LabelBadge";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";
import { formatDuration } from "@/src/lib/formatters";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";
import { Flows } from "../services/api/flows";

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
			blockFilters: {
				default: "[]",
			},
			displayMode: {
				default: "status",
			},
		},
		content: "none",
	},
	{
		render: (props) => {
			const { tenant } = useParams<{ tenant: string }>();
			const tenantName = tenant ? decodeURIComponent(tenant) : "";
			const settingsOpenBlockId = useNotebooksStore(
				(state) => state.settingsOpenBlockId,
			);
			const closeBlockSettings = useNotebooksStore(
				(state) => state.closeBlockSettings,
			);
			const flows = useNotebooksStore((state) => state.flows);
			const currentNotebook = useNotebooksStore(
				(state) => state.currentNotebook,
			);
			const startDate = useNotebooksStore((state) => state.startDate);
			const endDate = useNotebooksStore((state) => state.endDate);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const labels = useLabelsStore((state) => state.labels);

			const [selectedFlow, setSelectedFlow] = React.useState<Flow | null>(null);
			const [detailOpen, setDetailOpen] = React.useState(false);
			const [selectedFlows, setSelectedFlows] = React.useState<Flow[]>([]);

			const flowName = props.block.props.flowName as string;
			const title = props.block.props.title as string;
			const displayMode =
				(props.block.props.displayMode as "status" | "runCount" | "") ||
				"status";

			// Parse block filters from JSON string
			const blockFilters: Filter[] = React.useMemo(() => {
				try {
					return JSON.parse(props.block.props.blockFilters as string);
				} catch {
					return [];
				}
			}, [props.block.props.blockFilters]);

			// Merge notebook filters with block filters
			const filters = React.useMemo(
				() => [...(notebookFilters || []), ...blockFilters],
				[notebookFilters, blockFilters],
			);

			React.useEffect(() => {
				if (!tenantName || !startDate || !endDate || !currentNotebook?.id)
					return;
				const fetchFlows = async () => {
					try {
						const flows = await Flows.getByTenant(
							tenantName,
							startDate,
							endDate,
							filters,
							currentNotebook.id,
						);
						setSelectedFlows(flows.filter((flow) => flow.name === flowName));
					} catch (_) {
						setSelectedFlows([]);
					}
				};

				void fetchFlows();
			}, [
				tenantName,
				startDate,
				endDate,
				filters,
				currentNotebook?.id,
				flowName,
			]);

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

			const handleFlowClick = (flow: Flow) => {
				setSelectedFlow(flow);
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

			// Render content based on state
			const renderContent = () => {
				if (selectedFlows.length === 0) {
					return (
						<div className="outline-none flex flex-col gap-1">
							<Card className="@container/card shadow-none">
								<CardHeader className="pb-2 pt-2 pl-3">
									<CardDescription className="text-xl relative font-semibold flex items-center gap-2">
										<Badge
											variant="outline"
											className={
												"text-muted-foreground px-1.5 gap-1.5 border-0 text-base"
											}
										>
											<Circle
												className={cn("size-5", "text-muted-foreground")}
											/>
											{title || flowName || "N/A"}
										</Badge>
									</CardDescription>
								</CardHeader>
								<Separator />
								<CardContent className="px-6 py-3 text-secondary-foreground">
									No runs
								</CardContent>
								<CardFooter className="flex-col items-start gap-1.5 text-sm p-3 pt-0"></CardFooter>
							</Card>
						</div>
					);
				}

				return (
					<div className="outline-none flex flex-col gap-1">
						{selectedFlows.map((flow) => renderFlowHistory(flow))}
					</div>
				);
			};

			const renderFlowHistory = (flow: Flow) => {
				// Default "status" mode
				const config = statusConfig[flow.lastRunStatus];
				return (
					<div
						className="outline-none flex flex-col gap-1 group"
						key={flow.groupId}
					>
						<Card className="@container/card shadow-none">
							<CardHeader className="pb-2 pt-2 pl-3">
								<CardDescription className="text-xl relative font-semibold flex items-center gap-2">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Badge
													variant="outline"
													className={
														"text-muted-foreground px-1.5 gap-1.5 border-0 text-base"
													}
												>
													<config.Icon
														className={cn("size-5", config.iconClass)}
													/>
													{title || flow.name}
												</Badge>
											</TooltipTrigger>
											<TooltipContent>
												{flow.lastRunStatus === "running" && (
													<p>
														Running since{" "}
														{flow.lastRunStartedAt?.toLocaleString()}
													</p>
												)}
												{flow.lastRunStatus !== "running" && (
													<p>
														Last run ended at{" "}
														{flow.lastRunEndedAt?.toLocaleString()}
													</p>
												)}
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<div
										className="absolute right-0 -top-2 px-2 py-1.5 rounded-b-lg border border-t-0 bg-background group-hover:opacity-100 transition-opacity cursor-pointer z-10 flex items-center gap-1.5 opacity-0 shadow-xs"
										onClick={() => handleFlowClick(flow)}
									>
										<ChartNoAxesGantt className="size-4 text-muted-foreground" />
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											Details
										</span>
									</div>
								</CardDescription>
							</CardHeader>
							<Separator />
							<CardContent className="px-6 py-3">
								{displayMode === "runCount" && (
									<div className="grid grid-cols-2 sm:grid-cols-3">
										{/* Success */}
										<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 px-6 py-2 text-left border-0">
											<span className="text-muted-foreground text-xs flex items-center gap-2">
												<div className="h-2 w-2 rounded-full bg-[#5cb660]" />
												Success
											</span>
											<span className="text-lg leading-none font-bold sm:text-3xl">
												{flow.successCount.toLocaleString()}
											</span>
										</div>

										{/* Failed */}
										<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-2 text-left even:border-l sm:border-t-0 sm:border-l ">
											<span className="text-muted-foreground text-xs flex items-center gap-2">
												<div className="h-2 w-2 rounded-full bg-[#e56458]" />
												Failed
											</span>
											<span className="text-lg leading-none font-bold sm:text-3xl">
												{flow.failedCount.toLocaleString()}
											</span>
										</div>

										{/* Running */}
										<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-2 text-left even:border-l sm:border-t-0 sm:border-l">
											<span className="text-muted-foreground text-xs flex items-center gap-2">
												<div className="h-2 w-2 rounded-full bg-[#2883df]" />
												Running
											</span>
											<span className="text-lg leading-none font-bold sm:text-3xl">
												{flow.pendingCount.toLocaleString()}
											</span>
										</div>
									</div>
								)}
								{displayMode === "status" && (
									<div className="grid grid-cols-4 sm:grid-cols-4">
										{/* Success */}
										<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 px-6 py-2 text-left border-0">
											<span className="text-muted-foreground text-xs flex items-center gap-2">
												Last duration
											</span>
											<span className="text-lg leading-none font-bold sm:text-3xl">
												{formatDuration({
													seconds: flow.lastDurationInSeconds,
												})}
											</span>
										</div>

										{/* Failed */}
										<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-2 text-left even:border-l sm:border-t-0 sm:border-l ">
											<span className="text-muted-foreground text-xs flex items-center gap-2">
												Average duration
											</span>
											<span className="text-lg leading-none font-bold sm:text-3xl">
												{formatDuration({
													seconds: flow.avgDurationInSeconds,
												})}
											</span>
										</div>

										{/* Running */}
										<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-2 text-left even:border-l sm:border-t-0 sm:border-l">
											<span className="text-muted-foreground text-xs flex items-center gap-2">
												Min duration
											</span>
											<span className="text-lg leading-none font-bold sm:text-3xl">
												{formatDuration({
													seconds: flow.minDurationInSeconds,
												})}
											</span>
										</div>

										{/* Running */}
										<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-2 text-left even:border-l sm:border-t-0 sm:border-l">
											<span className="text-muted-foreground text-xs flex items-center gap-2">
												Max duration
											</span>
											<span className="text-lg leading-none font-bold sm:text-3xl">
												{formatDuration({
													seconds: flow.maxDurationInSeconds,
												})}
											</span>
										</div>
									</div>
								)}
							</CardContent>
							<CardFooter className="flex-col items-start gap-1.5 text-sm p-3 pt-0">
								<div className="flex gap-1">
									{Object.entries(flow.labels).map(([key, value]) => (
										<div key={key}>
											<LabelBadge labelKey={key} labelValue={value} readonly />
										</div>
									))}
								</div>
							</CardFooter>
						</Card>
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
								<SheetTitle>Flow Status Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Title
									</h3>
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
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Display
									</h3>
									<TooltipProvider delayDuration={300}>
										<Select
											value={displayMode}
											onValueChange={(value) => {
												props.editor.updateBlock(props.block, {
													props: {
														...props.block.props,
														displayMode: value,
													},
												});
											}}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<Tooltip>
													<TooltipTrigger asChild>
														<SelectItem value="status">Duration</SelectItem>
													</TooltipTrigger>
													<TooltipContent side="right">
														<p>Display flow duration across time period</p>
													</TooltipContent>
												</Tooltip>
												<Tooltip>
													<TooltipTrigger asChild>
														<SelectItem value="runCount">Count</SelectItem>
													</TooltipTrigger>
													<TooltipContent side="right">
														<p>Count of flow runs split by status</p>
													</TooltipContent>
												</Tooltip>
											</SelectContent>
										</Select>
									</TooltipProvider>
								</div>

								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Flow
									</h3>
									<FlowSelector
										flows={flows}
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
					{currentNotebook &&
						selectedFlow &&
						startDate !== null &&
						endDate !== null && (
							<FlowDetail
								labels={selectedFlow.labels}
								flowName={selectedFlow.name}
								open={detailOpen}
								startDate={startDate}
								endDate={endDate}
								onOpenChange={setDetailOpen}
								notebookId={currentNotebook.id}
							/>
						)}
				</>
			);
		},
	},
)();
