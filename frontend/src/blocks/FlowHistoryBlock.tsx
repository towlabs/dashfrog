"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
	CircleDot,
	Clock,
	Eye,
	EyeOff,
	ListCollapse,
	Tags,
	Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { FlowHistoryTable } from "@/components/FlowHistoryTable";
import { FlowSelector } from "@/components/FlowSelector";
import type { StatusFilter } from "@/components/FlowStatusButtons";
import { TableSkeleton } from "@/components/TableSkeleton";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Flows } from "@/src/services/api/flows";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";
import type { FlowHistory } from "../types/flow";

export const FlowHistoryBlock = createReactBlockSpec(
	{
		type: "flowHistory" as const,
		propSchema: {
			flowName: {
				default: "",
			},
			statusFilter: {
				default: "all" as StatusFilter,
			},
			showLabels: {
				default: true,
			},
			showStart: {
				default: true,
			},
			showEnd: {
				default: true,
			},
			showDuration: {
				default: true,
			},
			showStatus: {
				default: true,
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
			const openBlockSettings = useNotebooksStore(
				(state) => state.openBlockSettings,
			);
			const flows = useNotebooksStore((state) => state.flows);
			const startDate = useNotebooksStore((state) => state.startDate);
			const endDate = useNotebooksStore((state) => state.endDate);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const currentNotebookId = useNotebooksStore(
				(state) => state.currentNotebook?.id,
			);
			const labels = useLabelsStore((state) => state.labels);

			const [flowHistory, setFlowHistory] = useState<FlowHistory[] | null>(
				null,
			);
			const [loading, setLoading] = useState(false);

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

			// Fetch flow history when flowName is set
			useEffect(() => {
				const fetchFlowHistory = async () => {
					if (
						!tenantName ||
						!flowName ||
						!currentNotebookId ||
						startDate === null ||
						endDate === null ||
						filters === undefined
					) {
						setFlowHistory([]);
						return;
					}

					setLoading(true);
					try {
						const response = await Flows.getFlowHistory(
							tenantName,
							flowName,
							startDate,
							endDate,
							filters,
							currentNotebookId,
						);
						setFlowHistory(response);
					} catch (error) {
						console.error("Failed to fetch detailed flow:", error);
						setFlowHistory([]);
					} finally {
						setLoading(false);
					}
				};

				void fetchFlowHistory();
			}, [
				tenantName,
				flowName,
				startDate,
				endDate,
				filters,
				currentNotebookId,
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

			const handleFlowSelect = (selectedFlowName: string) => {
				props.editor.updateBlock(props.block, {
					props: {
						flowName: selectedFlowName,
					},
				});
			};

			const handleColumnToggle = (
				column:
					| "showLabels"
					| "showStart"
					| "showEnd"
					| "showDuration"
					| "showStatus",
				value: boolean,
			) => {
				props.editor.updateBlock(props.block, {
					props: {
						[column]: value,
					},
				});
			};

			const handleFiltersChange = (newFilters: Filter[]) => {
				props.editor.updateBlock(props.block, {
					props: {
						blockFilters: JSON.stringify(newFilters),
					},
				});
			};

			// Render content based on state
			const renderContent = () => {
				if (!flowName) {
					return (
						<EmptyState
							icon={ListCollapse}
							title="No flow selected"
							description="Select a flow to view its execution history."
							onClick={() => openBlockSettings(props.block.id)}
							className="cursor-pointer"
						/>
					);
				}

				if (loading && flowHistory === null) {
					return <TableSkeleton columns={6} rows={5} />;
				}

				return (
					<FlowHistoryTable
						flowHistory={flowHistory || []}
						statusFilter={"all"}
						visibleColumns={{
							labels: props.block.props.showLabels,
							start: props.block.props.showStart,
							end: props.block.props.showEnd,
							duration: props.block.props.showDuration,
							status: props.block.props.showStatus,
						}}
					/>
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
								<SheetTitle>Flow History Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
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

								<div className="space-y-1 mt-6">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Columns
									</h3>
									<div className="space-y-1">
										<div
											className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
											onClick={() =>
												handleColumnToggle(
													"showLabels",
													!props.block.props.showLabels,
												)
											}
										>
											<div className="flex items-center gap-2">
												<Tags className="size-4" strokeWidth={2.5} />
												<span className="text-sm">Labels</span>
											</div>
											{props.block.props.showLabels ? (
												<Eye className="size-4" strokeWidth={2.5} />
											) : (
												<EyeOff className="size-4" strokeWidth={2.5} />
											)}
										</div>
										<div
											className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
											onClick={() =>
												handleColumnToggle(
													"showStart",
													!props.block.props.showStart,
												)
											}
										>
											<div className="flex items-center gap-2">
												<Clock className="size-4" strokeWidth={2.5} />
												<span className="text-sm">Start</span>
											</div>
											{props.block.props.showStart ? (
												<Eye className="size-4" strokeWidth={2.5} />
											) : (
												<EyeOff className="size-4" strokeWidth={2.5} />
											)}
										</div>
										<div
											className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
											onClick={() =>
												handleColumnToggle(
													"showEnd",
													!props.block.props.showEnd,
												)
											}
										>
											<div className="flex items-center gap-2">
												<Clock className="size-4" strokeWidth={2.5} />
												<span className="text-sm">End</span>
											</div>
											{props.block.props.showEnd ? (
												<Eye className="size-4" strokeWidth={2.5} />
											) : (
												<EyeOff className="size-4" strokeWidth={2.5} />
											)}
										</div>
										<div
											className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
											onClick={() =>
												handleColumnToggle(
													"showDuration",
													!props.block.props.showDuration,
												)
											}
										>
											<div className="flex items-center gap-2">
												<Timer className="size-4" strokeWidth={2.5} />
												<span className="text-sm">Duration</span>
											</div>
											{props.block.props.showDuration ? (
												<Eye className="size-4" strokeWidth={2.5} />
											) : (
												<EyeOff className="size-4" strokeWidth={2.5} />
											)}
										</div>
										<div
											className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
											onClick={() =>
												handleColumnToggle(
													"showStatus",
													!props.block.props.showStatus,
												)
											}
										>
											<div className="flex items-center gap-2">
												<CircleDot className="size-4" strokeWidth={2.5} />
												<span className="text-sm">Status</span>
											</div>
											{props.block.props.showStatus ? (
												<Eye className="size-4" strokeWidth={2.5} />
											) : (
												<EyeOff className="size-4" strokeWidth={2.5} />
											)}
										</div>
									</div>
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
				</>
			);
		},
	},
)();
