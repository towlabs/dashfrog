"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
	CaseUpper,
	CircleDot,
	Clock,
	Eye,
	EyeOff,
	Hash,
	Tags,
	Timer,
} from "lucide-react";
import React from "react";
import { useParams } from "react-router-dom";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { FlowTable } from "@/components/FlowTable";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Filter } from "@/src/types/filter";

export const FlowBlock = createReactBlockSpec(
	{
		type: "flow" as const,
		propSchema: {
			showName: {
				default: true,
			},
			showLabels: {
				default: true,
			},
			showLastStatus: {
				default: true,
			},
			showLastStart: {
				default: true,
			},
			showLastEnd: {
				default: true,
			},
			showLastDuration: {
				default: true,
			},
			showRunCounts: {
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
			const startDate = useNotebooksStore((state) => state.startDate);
			const endDate = useNotebooksStore((state) => state.endDate);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const currentNotebookId = useNotebooksStore(
				(state) => state.currentNotebook?.id,
			);
			const labels = useLabelsStore((state) => state.labels);

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

			const handleColumnToggle = (
				column:
					| "showName"
					| "showLabels"
					| "showLastStatus"
					| "showLastStart"
					| "showLastEnd"
					| "showLastDuration"
					| "showRunCounts",
				value: boolean,
			) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						[column]: value,
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

			return (
				startDate !== null &&
				endDate !== null &&
				filters !== undefined &&
				currentNotebookId && (
					<>
						<div className="outline-none min-w-0 flex-1">
							<FlowTable
								notebookId={currentNotebookId}
								tenant={tenantName}
								startDate={startDate}
								endDate={endDate}
								filters={filters}
								visibleColumns={{
									name: props.block.props.showName,
									labels: props.block.props.showLabels,
									lastStatus: props.block.props.showLastStatus,
									lastStart: props.block.props.showLastStart,
									lastEnd: props.block.props.showLastEnd,
									lastDuration: props.block.props.showLastDuration,
									runCounts: props.block.props.showRunCounts,
								}}
							/>
						</div>

						<Sheet
							open={isSettingsOpen}
							onOpenChange={(open) => {
								if (!open) closeBlockSettings();
							}}
						>
							<SheetContent>
								<SheetHeader>
									<SheetTitle>Flow Settings</SheetTitle>
								</SheetHeader>

								<div className="mt-6">
									<div className="space-y-1">
										<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Columns
										</h3>
										<div className="space-y-1">
											<div
												className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
												onClick={() =>
													handleColumnToggle(
														"showName",
														!props.block.props.showName,
													)
												}
											>
												<div className="flex items-center gap-2">
													<CaseUpper className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Name</span>
												</div>
												{props.block.props.showName ? (
													<Eye className="size-4" strokeWidth={2.5} />
												) : (
													<EyeOff className="size-4" strokeWidth={2.5} />
												)}
											</div>
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
														"showLastStatus",
														!props.block.props.showLastStatus,
													)
												}
											>
												<div className="flex items-center gap-2">
													<CircleDot className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Last Status</span>
												</div>
												{props.block.props.showLastStatus ? (
													<Eye className="size-4" strokeWidth={2.5} />
												) : (
													<EyeOff className="size-4" strokeWidth={2.5} />
												)}
											</div>
											<div
												className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
												onClick={() =>
													handleColumnToggle(
														"showLastStart",
														!props.block.props.showLastStart,
													)
												}
											>
												<div className="flex items-center gap-2">
													<Clock className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Last Start</span>
												</div>
												{props.block.props.showLastStart ? (
													<Eye className="size-4" strokeWidth={2.5} />
												) : (
													<EyeOff className="size-4" strokeWidth={2.5} />
												)}
											</div>
											<div
												className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
												onClick={() =>
													handleColumnToggle(
														"showLastEnd",
														!props.block.props.showLastEnd,
													)
												}
											>
												<div className="flex items-center gap-2">
													<Clock className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Last End</span>
												</div>
												{props.block.props.showLastEnd ? (
													<Eye className="size-4" strokeWidth={2.5} />
												) : (
													<EyeOff className="size-4" strokeWidth={2.5} />
												)}
											</div>
											<div
												className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
												onClick={() =>
													handleColumnToggle(
														"showLastDuration",
														!props.block.props.showLastDuration,
													)
												}
											>
												<div className="flex items-center gap-2">
													<Timer className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Last Duration</span>
												</div>
												{props.block.props.showLastDuration ? (
													<Eye className="size-4" strokeWidth={2.5} />
												) : (
													<EyeOff className="size-4" strokeWidth={2.5} />
												)}
											</div>
											<div
												className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
												onClick={() =>
													handleColumnToggle(
														"showRunCounts",
														!props.block.props.showRunCounts,
													)
												}
											>
												<div className="flex items-center gap-2">
													<Hash className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Run Counts</span>
												</div>
												{props.block.props.showRunCounts ? (
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
				)
			);
		},
	},
)();
