"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ListCollapse } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
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
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { DetailedFlow } from "@/src/types/flow";
import { resolveTimeWindow } from "@/src/types/timewindow";

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
			const filters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);
			const [detailedFlow, setDetailedFlow] = useState<DetailedFlow | null>(
				null,
			);
			const [loadingDetail, setLoadingDetail] = useState(false);

			const flowName = props.block.props.flowName as string;
			const statusFilter = props.block.props.statusFilter as StatusFilter;

			// Fetch detailed flow when flowName is set
			useEffect(() => {
				const fetchDetailedFlow = async () => {
					if (
						!tenantName ||
						!flowName ||
						timeWindow === undefined ||
						filters === undefined
					) {
						setDetailedFlow(null);
						return;
					}

					setLoadingDetail(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);
						const response = await Flows.getDetailedFlow(
							tenantName,
							flowName,
							start,
							end,
							filters,
						);
						setDetailedFlow(response);
					} catch (error) {
						console.error("Failed to fetch detailed flow:", error);
						setDetailedFlow(null);
					} finally {
						setLoadingDetail(false);
					}
				};

				void fetchDetailedFlow();
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
							icon={ListCollapse}
							title="No flow selected"
							description="Select a flow to view its execution history."
							onClick={() => openBlockSettings(props.block.id)}
							className="cursor-pointer"
						/>
					);
				}

				if (loadingDetail) {
					return <TableSkeleton columns={6} rows={5} />;
				}

				return (
					<FlowHistoryTable
						detailedFlow={detailedFlow}
						statusFilter={statusFilter}
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
									<Label className="text-sm font-medium">Flow</Label>
									<FlowSelector
										flows={flows}
										flowsLoading={flowsLoading}
										selectedFlowName={flowName}
										onFlowSelect={handleFlowSelect}
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
