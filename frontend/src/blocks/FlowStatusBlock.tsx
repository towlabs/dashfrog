"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ChartNoAxesGantt } from "lucide-react";
import React from "react";
import { useParams } from "react-router-dom";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { FlowDetail } from "@/components/FlowDetail";
import { FlowSelector } from "@/components/FlowSelector";
import { LabelBadge } from "@/components/LabelBadge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDuration, formatTimeAgo } from "@/src/lib/formatters";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";

const flowStatusColors = {
	success: "bg-[#5cb660]",
	failure: "bg-[#e56458]",
	running: "bg-[#2883df]",
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
			const settingsOpenBlockId = useNotebooksStore(
				(state) => state.settingsOpenBlockId,
			);
			const closeBlockSettings = useNotebooksStore(
				(state) => state.closeBlockSettings,
			);
			const flows = useNotebooksStore((state) => state.flows);
			const flowsLoading = useNotebooksStore((state) => state.flowsLoading);
			const currentNotebook = useNotebooksStore(
				(state) => state.currentNotebook,
			);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const labels = useLabelsStore((state) => state.labels);

			const [selectedFlow, setSelectedFlow] = React.useState<Flow | null>(null);
			const [detailOpen, setDetailOpen] = React.useState(false);

			const flowName = props.block.props.flowName as string;
			const title = props.block.props.title as string;

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

			const selectedFlows = React.useMemo(() => {
				return flows.filter((flow) => {
					// Match flow name
					if (flow.name !== flowName) return false;

					// Match all filters
					return filters.every((filter) => {
						return flow.labels[filter.label] === filter.value;
					});
				});
			}, [flows, flowName, filters]);

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
				if (flowsLoading) {
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

				if (selectedFlows.length === 0) {
					return (
						<div className="outline-none flex flex-col gap-1">
							<Card className="@container/card shadow-none">
								<CardHeader>
									<CardDescription className="text-xl font-semibold flex items-baseline gap-2">
										<div
											className={cn(
												"w-2.5 h-2.5 rounded-full bg-muted-foreground",
											)}
										/>
										{title || flowName || "N/A"}
									</CardDescription>
									<CardTitle className="text-secondary-foreground text-sm font-normal">
										No runs
									</CardTitle>
								</CardHeader>
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
				return (
					<div
						className="outline-none flex flex-col gap-1 group"
						key={flow.groupId}
					>
						<Card className="@container/card shadow-none">
							<CardHeader>
								<CardDescription className="text-xl relative font-semibold flex items-baseline gap-2">
									<div
										className={cn(
											"w-2.5 h-2.5 rounded-full",
											flowStatusColors[flow.lastRunStatus],
										)}
									/>
									{title || flowName}
									<div
										className="absolute right-0 -top-6 px-2 py-1.5 rounded-b-lg border border-t-0 bg-background group-hover:opacity-100 transition-opacity cursor-pointer z-10 flex items-center gap-1.5 opacity-0 shadow-xs"
										onClick={() => handleFlowClick(flow)}
									>
										<ChartNoAxesGantt className="size-4 text-muted-foreground" />
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											Details
										</span>
									</div>
								</CardDescription>
								<CardTitle className="text-secondary-foreground text-sm font-normal">
									Duration:{" "}
									{formatDuration(flow.lastRunStartedAt, flow.lastRunEndedAt)}
									{flow.lastRunEndedAt && (
										<> - {formatTimeAgo(flow.lastRunEndedAt)}</>
									)}
								</CardTitle>
							</CardHeader>
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
					{currentNotebook && selectedFlow && (
						<FlowDetail
							labels={selectedFlow.labels}
							flowName={selectedFlow.name}
							open={detailOpen}
							timeWindow={currentNotebook.timeWindow}
							onOpenChange={setDetailOpen}
						/>
					)}
				</>
			);
		},
	},
)();
