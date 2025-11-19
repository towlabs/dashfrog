"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ListCollapse } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { FlowHistoryTable } from "@/components/FlowHistoryTable";
import { FlowSelector } from "@/components/FlowSelector";
import type { StatusFilter } from "@/components/FlowStatusButtons";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Label } from "@/components/ui/label";
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
import { resolveTimeWindow } from "@/src/types/timewindow";
import { FlowHistory } from "../types/flow";

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
			const flowsLoading = useNotebooksStore((state) => state.flowsLoading);
			const timeWindow = useNotebooksStore(
				(state) => state.currentNotebook?.timeWindow,
			);
			const notebookFilters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const labels = useLabelsStore((state) => state.labels);

			const [flowHistory, setFlowHistory] = useState<FlowHistory[]>([]);
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
						timeWindow === undefined ||
						filters === undefined
					) {
						setFlowHistory([]);
						return;
					}

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
						setFlowHistory(response);
					} catch (error) {
						console.error("Failed to fetch detailed flow:", error);
						setFlowHistory([]);
					} finally {
						setLoading(false);
					}
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

				if (loading) {
					return <TableSkeleton columns={6} rows={5} />;
				}

				return (
					<FlowHistoryTable flowHistory={flowHistory} statusFilter={"all"} />
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
				</>
			);
		},
	},
)();
